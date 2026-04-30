// Clear localStorage data from old authentication system
localStorage.removeItem('customerUser');
localStorage.removeItem('customerToken');
localStorage.removeItem('firebaseToken');
localStorage.removeItem('firebaseUid');
console.log('Cleared old authentication data from localStorage');
