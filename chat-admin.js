document.addEventListener('DOMContentLoaded', () => {
    const userList = document.getElementById('user-list');
    const messagesDiv = document.getElementById('admin-chat-messages');
    const inputArea = document.getElementById('admin-chat-input-area');
    const input = document.getElementById('admin-chat-input');
    const sendButton = document.getElementById('admin-send-button');
    const noChatSelectedDiv = messagesDiv.querySelector('.no-chat-selected');

    let currentAdmin = null;
    let selectedUserId = null;
    let unsubscribeMessages = null; // To stop listening to current chat
    let unsubscribeSessions = null; // To stop listening to session list
    
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
            isAdmin: true 
        };

        const chatRef = db.collection('chats').doc(selectedUserId).collection('messages');
        const sessionRef = db.collection('chat_sessions').doc(selectedUserId); // Update user's session

        chatRef.add(messageData)
            .then(() => {
                console.log('Admin message sent successfully');
                input.value = ''; // Clear input
                // Update session metadata (optional)
                return sessionRef.update({ lastMessageTimestamp: messageData.timestamp });
            })
            .catch(error => {
                console.error("Error sending admin message:", error);
                alert('Failed to send message.');
            });
    };

    // Load and display the list of chat sessions
    const loadChatSessions = () => {
        if (unsubscribeSessions) unsubscribeSessions(); // Stop previous listener
        
        const sessionsRef = db.collection('chat_sessions').orderBy('lastMessageTimestamp', 'desc');

        unsubscribeSessions = sessionsRef.onSnapshot(snapshot => {
             userList.innerHTML = ''; // Clear current list
             if (snapshot.empty) {
                 userList.innerHTML = '<li>No active chats.</li>';
                 return;
             }
             snapshot.forEach(doc => {
                 const sessionData = doc.data();
                 const userId = doc.id;
                 const li = document.createElement('li');
                 li.dataset.userId = userId;
                 
                 const emailSpan = document.createElement('span');
                 emailSpan.className = 'email';
                 emailSpan.textContent = sessionData.userEmail || 'Unknown Email';
                 
                 const uidSpan = document.createElement('span'); // Maybe display UID part
                 uidSpan.textContent = userId.substring(0, 8) + '...'; 
                 
                 li.appendChild(uidSpan);
                 li.appendChild(emailSpan);
                 
                 // Highlight if currently selected
                 if (userId === selectedUserId) {
                     li.classList.add('active');
                 }

                 li.addEventListener('click', () => loadChatMessages(userId));
                 userList.appendChild(li);
             });
        }, error => {
            console.error("Error loading chat sessions:", error);
            userList.innerHTML = '<li class="error">Error loading chats.</li>';
        });
    };

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
            loadChatSessions(); // Load user list for admin
        } else {
            console.log('User is not admin or not logged in.');
            if (unsubscribeSessions) unsubscribeSessions();
            if (unsubscribeMessages) unsubscribeMessages();
            document.body.innerHTML = '<div style="padding: 50px; text-align: center;"><h1>Access Denied</h1><p>You must be logged in as the administrator to view this page.</p><a href="/login.html">Login</a></div>';
            // Redirect handled by auth.js, but this provides immediate feedback
        }
    });
}); 