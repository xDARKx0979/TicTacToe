// Get references to Firebase services (initialized in firebase-init.js)
const fbAuth = firebase.auth();
const db = firebase.firestore();
const { FieldValue } = firebase.firestore; // For atomic increments

document.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('survey-form');
    const submitButton = document.getElementById('submit-survey');
    const errorElement = document.getElementById('survey-error');

    // Redirect if user somehow lands here without being logged in
    if (!fbAuth.currentUser) {
        console.log('User not logged in, redirecting from survey page to login.');
        window.location.href = '/login.html';
        return; // Stop script execution
    }

    surveyForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        submitButton.disabled = true; // Disable button during submission
        errorElement.style.display = 'none';
        errorElement.textContent = '';

        const formData = new FormData(surveyForm);
        const choice = formData.get('monetization_choice');

        if (!choice) {
            errorElement.textContent = 'Please select an option.';
            errorElement.style.display = 'block';
            submitButton.disabled = false;
            return;
        }

        const user = fbAuth.currentUser;
        if (!user) {
            // Should not happen due to initial check, but safeguard
            errorElement.textContent = 'Error: Not logged in. Redirecting...';
            errorElement.style.display = 'block';
            setTimeout(() => { window.location.href = '/login.html'; }, 2000);
            return;
        }

        const userId = user.uid;
        const userDocRef = db.collection('users').doc(userId);
        const resultsDocRef = db.collection('surveyResults').doc('aggregate');

        console.log(`Submitting survey choice: User=${userId}, Choice=${choice}`);

        // Determine which counter to increment
        const incrementField = `count${choice}`; // e.g., countA, countB
        const updateData = {};
        updateData[incrementField] = FieldValue.increment(1);

        // Use a Firestore transaction to update both documents atomically
        db.runTransaction((transaction) => {
            return transaction.get(resultsDocRef).then((resultsDoc) => {
                // Update user document
                transaction.set(userDocRef, {
                    surveyCompleted: true,
                    surveyChoice: choice,
                    email: user.email // Optionally store email
                }, { merge: true }); // Create or merge user document

                // Update aggregate results document
                if (!resultsDoc.exists) {
                    // If aggregate doc doesn't exist, create it with initial count
                    transaction.set(resultsDocRef, updateData);
                } else {
                    // If aggregate doc exists, update it with increment
                    transaction.update(resultsDocRef, updateData);
                }
            });
        }).then(() => {
            console.log('>>> Survey TX success!');
            // Redirect user to their original destination or index page
            const storedRedirect = sessionStorage.getItem('redirectAfterSurvey');
            console.log(`>>> redirectAfterSurvey from sessionStorage: ${storedRedirect}`);
            const redirectUrl = storedRedirect || '/index.html';
            console.log(`>>> Calculated redirectUrl: ${redirectUrl}`);
            
            // Attempting redirect
            try {
                sessionStorage.removeItem('redirectAfterSurvey'); // Remove before redirect
                console.log(`>>> Attempting redirect to: ${redirectUrl}`);
                window.location.href = redirectUrl;
                console.log('>>> Redirect command issued.'); // This might not log if redirect is immediate
            } catch (e) {
                console.error('>>> Error during redirect attempt:', e);
                // Fallback UI feedback if redirect fails
                errorElement.textContent = 'Survey saved! Redirecting...'; 
                errorElement.style.display = 'block';
            }
        }).catch((error) => {
            console.error("Error submitting survey:", error);
            errorElement.textContent = 'Failed to submit survey. Please try again.';
            errorElement.style.display = 'block';
            submitButton.disabled = false; // Re-enable button on error
        });
    });
}); 