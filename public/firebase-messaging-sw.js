importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAivsLIktDqF2OCd8clRsIi3NNvrAh80b0",
  authDomain: "barr-73df3.firebaseapp.com",
  projectId: "barr-73df3",
  storageBucket: "barr-73df3.firebasestorage.app",
  messagingSenderId: "270156585080",
  appId: "1:270156585080:web:1260bbe5e0fad35ed4f58d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'بار', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
  });
});
