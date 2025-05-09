document.addEventListener('DOMContentLoaded', () => {
    const messagesDiv = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const loadingDiv = messagesDiv.querySelector('.loading');

    let currentUser = null;
    let unsubscribe = null; // To stop listening when needed
    const db = firebase.firestore();
    const ADMIN_UID = "II9Ifc2Cu1Mc2ExdoR8k4v5Uhyy2"; // Ensure this matches your admin UID
    const LAST_NOTIFIED_ADMIN_MESSAGE_TIMESTAMP_KEY = 'lastNotifiedAdminMessageTimestamp'; // Same key as in auth.js

    // Scroll to the bottom of the chat messages
    const scrollToBottom = () => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    // Display a single message
    const displayMessage = (msgData) => {
        const msgElement = document.createElement('div');
        msgElement.classList.add('message');
        
        const sender = document.createElement('div');
        sender.classList.add('sender');
        
        if (msgData.isAdmin) {
            msgElement.classList.add('dev-message');
            sender.textContent = 'Developer';
        } else {
            msgElement.classList.add('user-message');
            // Don't display sender name for user's own messages
            // sender.textContent = msgData.senderEmail || 'You'; 
        }
        
        const text = document.createElement('div');
        text.textContent = msgData.text;
        
        // Add sender only if it's from the developer
        if (msgData.isAdmin) {
             msgElement.appendChild(sender);
        }
        msgElement.appendChild(text);
        messagesDiv.appendChild(msgElement);
    };

    // Load and listen for messages
    const loadChat = (userId) => {
        if (unsubscribe) unsubscribe(); // Stop previous listener
        
        messagesDiv.innerHTML = ''; // Clear previous messages
        
        // Clear unread message flag when chat is loaded by the user
        if (currentUser && currentUser.uid === userId) { // Ensure it's the current user's chat
            localStorage.removeItem('hasUnreadDevMessages');
            console.log("'hasUnreadDevMessages' flag cleared.");
        }

        const messagesRef = db.collection('chats').doc(userId).collection('messages').orderBy('timestamp', 'asc');

        unsubscribe = messagesRef.onSnapshot(snapshot => {
            console.log(`Received ${snapshot.docChanges().length} changes`);
            let newDevMessage = false;
            let latestAdminMessageTsMillis = 0;

            if (messagesDiv.querySelector('.loading')) {
                 messagesDiv.innerHTML = ''; // Clear loading message
            }
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    console.log('New message:', messageData);
                    displayMessage(messageData);

                    if (currentUser && messageData.senderId !== currentUser.uid && (messageData.isAdmin || messageData.senderId === ADMIN_UID)) {
                        newDevMessage = true;
                        // Track the latest admin message timestamp from this batch
                        if (messageData.timestamp && messageData.timestamp.toMillis() > latestAdminMessageTsMillis) {
                            latestAdminMessageTsMillis = messageData.timestamp.toMillis();
                        }
                    }
                }
            });

            if (newDevMessage) {
                const pingSound = document.getElementById('ping-sound');
                if (pingSound) {
                    pingSound.play().catch(error => console.warn("Ping sound play failed:", error)); // Play sound
                }
                localStorage.setItem('hasUnreadDevMessages', 'true'); // Set flag for bubble
                console.log("'hasUnreadDevMessages' flag set for bubble.");

                // Update the lastNotified timestamp to the latest admin message seen on this page
                if (latestAdminMessageTsMillis > 0) {
                    const currentLastNotified = parseInt(localStorage.getItem(LAST_NOTIFIED_ADMIN_MESSAGE_TIMESTAMP_KEY) || '0', 10);
                    if (latestAdminMessageTsMillis > currentLastNotified) {
                        localStorage.setItem(LAST_NOTIFIED_ADMIN_MESSAGE_TIMESTAMP_KEY, latestAdminMessageTsMillis.toString());
                        console.log(`[Chat User] Updated lastNotifiedAdminMessageTimestamp to ${new Date(latestAdminMessageTsMillis).toISOString()}`);
                    }
                }
            }

            scrollToBottom(); // Scroll down after new messages are added
        }, error => {
            console.error("Error listening to chat messages:", error);
             messagesDiv.innerHTML = '<div class="error">Error loading chat. Please try again later.</div>';
        });
    };

    // Send a message
    const sendMessage = () => {
        const text = input.value.trim();
        if (text === '' || !currentUser) return;

        const messageData = {
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            isAdmin: false 
        };

        const chatRef = db.collection('chats').doc(currentUser.uid).collection('messages');
        const sessionRef = db.collection('chat_sessions').doc(currentUser.uid);

        chatRef.add(messageData)
            .then(() => {
                console.log('Message sent successfully');
                input.value = ''; // Clear input

                // Play sent sound
                const sentSound = document.getElementById('sent-ping-sound');
                if (sentSound) {
                    sentSound.play().catch(error => console.warn("Sent ping sound play failed:", error));
                }

                // Update session metadata (optional but good for admin view)
                return sessionRef.set({ 
                    lastMessageTimestamp: messageData.timestamp, 
                    userEmail: currentUser.email 
                }, { merge: true });
            })
            .catch(error => {
                console.error("Error sending message:", error);
                alert('Failed to send message. Please try again.');
            });
    };

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Authentication check
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // --- ADMIN CHECK --- 
            // If the logged-in user is the admin, redirect them away from user chat page
            if (user.uid === ADMIN_UID) {
                console.log("Admin detected on user chat page. Redirecting to admin chat.");
                window.location.replace('/chat-admin.html'); // Use replace to avoid history entry
                return; // Stop further execution for admin on this page
            }
            // --- END ADMIN CHECK ---
            
            // If not admin, proceed as normal user
            console.log('User authenticated for chat:', user.uid);
            currentUser = user;
            // Ensure Firestore is ready (sometimes a slight delay is needed)
            setTimeout(() => {
                 loadChat(user.uid);
                 // Clear bubble flag & update last notified timestamp for any messages initially loaded
                 localStorage.removeItem('hasUnreadDevMessages');
                 console.log("'hasUnreadDevMessages' flag cleared on auth state change after loadChat call.");
                 
                 // Proactively update lastNotified timestamp on entering chat page if there are existing admin messages
                 // This requires a one-time read or using the initial snapshot from loadChat
                 // The logic inside loadChat's onSnapshot will handle this for newly arriving messages while on page.
                 // For messages already there when loadChat is called, we need an explicit update.
                 // For simplicity, the onSnapshot in loadChat will now handle updating this timestamp.
                 // If there are no *new* admin messages in the first snapshot, latestAdminMessageTsMillis will remain 0, 
                 // and no update to LAST_NOTIFIED_ADMIN_MESSAGE_TIMESTAMP_KEY will occur from here, which is fine.
                 // The main purpose is to update it if new admin messages *do* arrive while on this page.

            }, 500); // Small delay to ensure Firestore connection is stable
        } else {
            console.log('User not authenticated, cannot load chat.');
            if (unsubscribe) unsubscribe();
            messagesDiv.innerHTML = '<div class="error">Please log in to chat.</div>';
             input.disabled = true;
             sendButton.disabled = true;
            // Redirect handled by auth.js
        }
    });
}); 