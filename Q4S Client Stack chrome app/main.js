chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('q4s_window.html', {
  	frame: "none",
    width: 780,
    height: 780
  });
});