/* main (popup) */
document.addEventListener("DOMContentLoaded", () => {
  const saveNameInput = document.querySelector("#saveName");
  const saveBtn = document.querySelector("#save");

  chrome.storage.sync.get(["fileNameFormat"], (val) => {
    saveNameInput.value = val.fileNameFormat;
  });

  saveBtn.addEventListener("click", () => {
    const saveName = saveNameInput.value;
    chrome.storage.sync.set({ fileNameFormat }, () => {
      // show a saved message/toast
      console.log("saved");
    });
  });
});
/* evt listeners for popup */
