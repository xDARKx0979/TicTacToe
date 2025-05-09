document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('user-list');
    const messagesDiv = document.getElementById('admin-chat-messages');
    const inputArea = document.getElementById('admin-chat-input-area');
    const input = document.getElementById('admin-chat-input');
    const sendButton = document.getElementById('admin-send-button');
    const noChatSelectedDiv = messagesDiv.querySelector('.no-chat-selected');

    let currentAdmin = null;
    let selectedUserId = null;
    let selectedUserEmail = null; // To store the email of the selected user
    let unsubscribeMessages = null; // To stop listening to current chat
    let unsubscribeUserList = null; // Renamed from unsubscribeSessions
    let allUserUids = []; // To store UIDs of all listed users for messaging all
    
    const db = firebase.firestore();
    const ADMIN_UID = "II9Ifc2Cu1Mc2ExdoR8k4v5Uhyy2"; // Ensure this matches your admin UID

    // Scroll to the bottom of the chat messages
    const scrollToBottom = () => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };

    // Display a single message in the admin view
    const displayMessage = (msgData) => {
        const msgElement = document.createElement('div');
        msgElement.classList.add('message');
        
        const sender = document.createElement('div');
        sender.classList.add('sender');
        
        if (msgData.isAdmin) {
            msgElement.classList.add('dev-message');
            sender.textContent = 'You (Developer)';
        } else {
            msgElement.classList.add('user-message');
            sender.textContent = msgData.senderEmail || 'User (' + (msgData.senderId ? msgData.senderId.substring(0, 6) : 'Unknown') + '...)'; 
        }
        
        const text = document.createElement('div');
        text.textContent = msgData.text;
        
        msgElement.appendChild(sender);
        msgElement.appendChild(text);
        messagesDiv.appendChild(msgElement);
    };

    // Load messages for a specific user
    const loadChatMessages = (userId) => {
        if (unsubscribeMessages) unsubscribeMessages(); // Stop listening to previous chat
        
        selectedUserId = userId; // Track selected user
        // Find the email for the selectedUserId from the allUserUids or directly from the DOM if easier
        // For simplicity, let's assume we might need to re-query or have it available
        // A better way would be to pass the email along or get it from the clicked li element
        const userLi = userList.querySelector(`li[data-user-id="${userId}"]`);
        if (userLi && userLi.firstChild && userLi.firstChild.textContent) {
            selectedUserEmail = userLi.firstChild.textContent; // Assuming the email is the firstChild's text
        } else {
            selectedUserEmail = 'Email not found'; // Fallback
            console.warn(`Could not find email for userId: ${userId} from list item.`);
        }

        messagesDiv.innerHTML = '<div class="loading">Loading messages...</div>'; // Show loading
        inputArea.style.display = 'flex'; // Show input area

        const messagesRef = db.collection('chats').doc(userId).collection('messages').orderBy('timestamp', 'asc');

        unsubscribeMessages = messagesRef.onSnapshot(snapshot => {
             if (messagesDiv.querySelector('.loading')) {
                  messagesDiv.innerHTML = ''; // Clear loading message only once
             }
             snapshot.docChanges().forEach(change => {
                 if (change.type === 'added') {
                     displayMessage(change.doc.data());
                 }
                 // TODO: Handle modified/deleted messages if needed
             });
             scrollToBottom();
        }, error => {
            console.error(`Error listening to messages for user ${userId}:`, error);
            messagesDiv.innerHTML = '<div class="error">Error loading messages.</div>';
            inputArea.style.display = 'none'; // Hide input on error
        });
        
        // Update active class in user list
        document.querySelectorAll('#user-list li').forEach(li => {
            li.classList.toggle('active', li.dataset.userId === userId);
        });
    };

    // Send a message as admin
    const sendAdminMessage = () => {
        const text = input.value.trim();
        if (text === '' || !currentAdmin || !selectedUserId) return;

        const messageData = {
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            senderId: currentAdmin.uid, // Admin's UID
            isAdmin: true,
            // senderEmail is not needed for admin messages as it's identified by isAdmin
        };

        const chatRef = db.collection('chats').doc(selectedUserId).collection('messages');
        const sessionRef = db.collection('chat_sessions').doc(selectedUserId);

        chatRef.add(messageData)
            .then(() => {
                console.log('Admin message sent successfully');
                input.value = ''; // Clear input
                // Update/Create session metadata using set with merge
                return sessionRef.set({
                    lastMessageTimestamp: messageData.timestamp,
                    userEmail: selectedUserEmail || 'Unknown Email' // Use the stored email
                }, { merge: true });
            })
            .catch(error => {
                console.error("Error sending admin message:", error);
                alert('Failed to send message.');
            });
    };

    // Load and display the list of users from the 'users' collection
    const loadUserList = () => {
        if (unsubscribeUserList) unsubscribeUserList();
        
        // Query the 'users' collection. We assume documents here have an 'email' field.
        // And the document ID is the user's UID.
        const usersRef = db.collection('users').orderBy('email', 'asc'); // Order by email

        unsubscribeUserList = usersRef.onSnapshot(snapshot => {
             userList.innerHTML = ''; // Clear current list
             allUserUids = []; // Reset the list of UIDs
             if (snapshot.empty) {
                 userList.innerHTML = '<li>No users found.</li>';
                 return;
             }
             snapshot.forEach(doc => {
                 const userData = doc.data();
                 const userId = doc.id; // UID is the document ID
                 allUserUids.push(userId); // Add UID to our list for messaging all

                 const li = document.createElement('li');
                 li.dataset.userId = userId;
                 
                 const emailSpan = document.createElement('span');
                 emailSpan.className = 'email'; // Ensure styles.css has a rule for this if needed
                 emailSpan.textContent = userData.email || 'Email not available'; // Display email
                                  
                 li.appendChild(emailSpan);
                 // UID is no longer displayed directly in the list item
                 
                 // Highlight if currently selected
                 if (userId === selectedUserId) {
                     li.classList.add('active');
                 }

                 li.addEventListener('click', () => loadChatMessages(userId));
                 userList.appendChild(li);
             });
        }, error => {
            console.error("Error loading user list:", error);
            userList.innerHTML = '<li class="error">Error loading users.</li>';
        });
    };

    // --- New Function: Send Message to All Listed Users ---
    const sendMessageToAllListedUsers = async () => {
        const messageText = document.getElementById('admin-message-all-input').value.trim();
        if (!messageText) {
            alert('Please enter a message to send to all users.');
            return;
        }
        if (!currentAdmin) {
            alert('Admin not authenticated.');
            return;
        }
        if (allUserUids.length === 0) {
            alert('No users to send messages to.');
            return;
        }

        const confirmation = confirm(`Are you sure you want to send this message to ${allUserUids.length} user(s)?`);
        if (!confirmation) return;

        let successCount = 0;
        let errorCount = 0;

        const messageData = {
            text: messageText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            senderId: currentAdmin.uid,
            isAdmin: true 
        };

        for (const userId of allUserUids) {
            const chatRef = db.collection('chats').doc(userId).collection('messages');
            const sessionRef = db.collection('chat_sessions').doc(userId);
            try {
                await chatRef.add(messageData);
                // Optionally update the session document for each user
                await sessionRef.set({ 
                    lastMessageTimestamp: messageData.timestamp,
                    // userEmail will already be there or can be set if needed
                 }, { merge: true });
                successCount++;
            } catch (error) {
                console.error(`Failed to send message to user ${userId}:`, error);
                errorCount++;
            }
        }

        alert(`Message sending complete.\nSuccessfully sent to: ${successCount} user(s).\nFailed for: ${errorCount} user(s).`);
        if (errorCount === 0) {
            document.getElementById('admin-message-all-input').value = ''; // Clear input on full success
        }
    };
    // -----------------------------------------------------

    // Event listeners for sending message
    sendButton.addEventListener('click', sendAdminMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendAdminMessage();
        }
    });

    // Authentication check for Admin
    firebase.auth().onAuthStateChanged(user => {
        if (user && user.uid === ADMIN_UID) {
            console.log('Admin authenticated:', user.uid);
            currentAdmin = user;
            loadUserList(); // Changed from loadChatSessions
            // Attach listener for the new 'Message All' button if it exists
            const messageAllButton = document.getElementById('admin-send-all-button');
            if (messageAllButton) {
                messageAllButton.addEventListener('click', sendMessageToAllListedUsers);
            }
        } else {
            console.log('User is not admin or not logged in.');
            if (unsubscribeUserList) unsubscribeUserList(); // Changed from unsubscribeSessions
            if (unsubscribeMessages) unsubscribeMessages();
            document.body.innerHTML = '<div style="padding: 50px; text-align: center;"><h1>Access Denied</h1><p>You must be logged in as the administrator to view this page.</p><a href="/login.html">Login</a></div>';
            // Redirect handled by auth.js, but this provides immediate feedback
        }
    });
}); 