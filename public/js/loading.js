// Wait for the window to fully load (including images and other resources)
window.onload = function () {
  const loadingOverlay = document.getElementById("loadingOverlay");

  // Initialize the Lottie animation
  const animation = lottie.loadAnimation({
    container: document.getElementById('lottieLoading'), // The container for the animation
    renderer: 'svg', // You can also use 'canvas' or 'html'
    loop: true, // Set to true for continuous loop
    autoplay: true, // Automatically start animation
    path: 'https://lottie.host/8315ccce-1767-451c-9623-3f6e7726bb46/g1Vcqs68mr.json' // Lottie animation URL
  });

  // Hide the loading overlay once everything is fully loaded
  setTimeout(function () {
    loadingOverlay.classList.add("hidden");
  }, 500); // Adjust the delay as needed (this is for smooth transition)
};
