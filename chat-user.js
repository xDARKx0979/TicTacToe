document.addEventListener('DOMContentLoaded', () => {
    const messagesDiv = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const loadingDiv = messagesDiv.querySelector('.loading');

    let currentUser = null;
    let unsubscribe = null; // To stop listening when needed
    const db = firebase.firestore();
    const ADMIN_UID = "II9Ifc2Cu1Mc2ExdoR8k4v5Uhyy2"; // Ensure this matches your admin UID

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
            if (messagesDiv.querySelector('.loading')) {
                 messagesDiv.innerHTML = ''; // Clear loading message
            }
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const messageData = change.doc.data();
                    console.log('New message:', messageData);
                    displayMessage(messageData);

                    // Check if the message is from the dev (isAdmin or senderId is ADMIN_UID)
                    // and currentUser is available to ensure we don't trigger for user's own initial load
                    if (currentUser && messageData.senderId !== currentUser.uid && (messageData.isAdmin || messageData.senderId === ADMIN_UID)) {
                        newDevMessage = true;
                    }
                }
            });

            if (newDevMessage) {
                const pingSound = document.getElementById('ping-sound');
                if (pingSound) {
                    pingSound.play().catch(error => console.warn("Ping sound play failed:", error)); // Play sound
                }
                localStorage.setItem('hasUnreadDevMessages', 'true'); // Set flag
                console.log("'hasUnreadDevMessages' flag set.");
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
                 // Also clear flag here in case onAuthStateChanged is the entry point
                 // and loadChat might not immediately clear it if called with a different uid initially (though unlikely here)
                 localStorage.removeItem('hasUnreadDevMessages');
                 console.log("'hasUnreadDevMessages' flag cleared on auth state change after loadChat call.");
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