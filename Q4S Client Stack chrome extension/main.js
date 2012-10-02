chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('q4s_window.html', {
    width: 780,
    height: 580
  });
});