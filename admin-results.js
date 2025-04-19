// Get references to Firebase services
const fbAuth = firebase.auth();
const db = firebase.firestore();

// --- CONFIGURATION ---
const ADMIN_UID = "II9Ifc2Cu1Mc2ExdoR8k4v5Uhyy2"; // <<< Your specific Firebase User ID
// ---------------------

document.addEventListener('DOMContentLoaded', () => {
    const loadingDiv = document.getElementById('results-loading');
    const errorDiv = document.getElementById('results-error');
    const unauthorizedDiv = document.getElementById('results-unauthorized');
    const contentDiv = document.getElementById('results-content');

    const countAElem = document.getElementById('countA');
    const countBElem = document.getElementById('countB');
    const countCElem = document.getElementById('countC');
    const countDElem = document.getElementById('countD');

    // Check authentication state
    fbAuth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in, check if their UID matches the admin UID
            if (user.uid === ADMIN_UID) {
                console.log('Admin user authenticated by UID:', user.uid);
                fetchAndDisplayResults();
            } else {
                // User is logged in but not admin
                console.warn('Unauthorized user attempt UID:', user.uid);
                showUnauthorized();
            }
        } else {
            // User is not logged in
            console.log('User not logged in, showing unauthorized.');
            showUnauthorized();
        }
    });

    function fetchAndDisplayResults() {
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        unauthorizedDiv.style.display = 'none';
        contentDiv.style.display = 'none';

        const resultsDocRef = db.collection('surveyResults').doc('aggregate');

        // Use onSnapshot for real-time updates (optional, could use .get() for one-time fetch)
        resultsDocRef.onSnapshot((doc) => {
            loadingDiv.style.display = 'none'; // Hide loading once data (or lack thereof) arrives
            if (doc.exists) {
                console.log("Current results data:", doc.data());
                const data = doc.data();
                // Update counts, defaulting to 0 if a field doesn't exist yet
                countAElem.textContent = data.countA || 0;
                countBElem.textContent = data.countB || 0;
                countCElem.textContent = data.countC || 0;
                countDElem.textContent = data.countD || 0;
                contentDiv.style.display = 'block'; // Show results content
            } else {
                // doc.data() will be undefined in this case
                console.log("No aggregate results document found!");
                // Display all zeros
                countAElem.textContent = 0;
                countBElem.textContent = 0;
                countCElem.textContent = 0;
                countDElem.textContent = 0;
                contentDiv.style.display = 'block'; // Show results content (with zeros)
            }
        }, (error) => {
            console.error("Error fetching survey results: ", error);
            loadingDiv.style.display = 'none';
            errorDiv.textContent = `Error fetching results: ${error.message}`;
            errorDiv.style.display = 'block';
            contentDiv.style.display = 'none';
        });
    }

    function showUnauthorized() {
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        contentDiv.style.display = 'none';
        unauthorizedDiv.style.display = 'block';
    }
}); 