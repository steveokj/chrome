(function () {
  // Check if the script is already injected and return
  if (window.__contentScriptContextMenu) {
    // toggleContextMenu(); // Toggle contextMenu when action button is clicked again
    return;
  }

  window.__contentScriptContextMenu = true;

  // Listen for messages from the background script to manipulate the DOM
  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    console.log("message from background: ", request.message);
    if (request.message === "hello") {
      toggleContextMenu(true); // Toggle contextMenu when action button is clicked again from background.js
      sendResponse({ message: "hi" });
    }
    return true;
  });

  // Define the custom context menu HTML as a string
  const contextMenuHTML = `
<div id="custom-context-menu" style="display: block;">
    <ul>
        <li data-menu-item data-has-child>
            <ul class="child-menu left">
                <li data-menu-item>Turn Off</li>
            </ul>
            View Bookmarks
            <ul class="child-menu right">
                <li data-menu-item>Overview</li>
            </ul>
        </li>
        <li data-menu-item>
            Create Bookmark
        </li>
        <li data-menu-item>screenshot</li>
    </ul>
</div>
`;

  // Inject the custom context menu into the page
  document.body.insertAdjacentHTML("beforeend", contextMenuHTML);

  // Define the custom context menu CSS as a string
  const contextMenuCSS = `
#custom-context-menu {
    position: absolute;
    background-color: white;
    border: 1px solid #ccc;
    /* box-shadow: 0px 0px 5px #aaa; */
    z-index: 10000;
    top: 2px;
    right: 20%;
    font-family: "Segoe UI", Tahoma, sans-serif !important;
    font-size: 12px;
}

#custom-context-menu ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
    width: max-content;
}

#custom-context-menu ul li {
    padding: 8px 12px;
    cursor: pointer;
    position: relative;
}

#custom-context-menu ul li {
    border-bottom: 1px solid #ccc;  /* Add this line for main menu items */
}

#custom-context-menu ul li:last-child {
    border-bottom: none;  /* Remove border from last main menu item */
}

/* Target 2nd descendent ul to fix border line alignment => https://www.meta.ai/c/f562ef69-edf7-4222-96e6-c0ecafb4f886 */
#custom-context-menu ul ul {
    margin: -1px 0;
}

#custom-context-menu ul li:hover {
    background-color: #eee;
}

#custom-context-menu li[data-selected] {
    background: #caf9f9;
}

.child-menu {
    display: none;
    position: absolute;
    top: 0;
    background-color: white;
    border: 1px solid #ccc;
}

.child-menu.left {
    right: 100%;
}

.child-menu.right {
    left: 100%;
}

li[data-selected] > .child-menu, li[data-child-active] > .child-menu {
    display: block;
}

/* Show child menu on hover */
li[data-has-child]:hover > .child-menu {
    display: block;
}

/* Show all child menu on action button click */
.show-child-menu .child-menu {
    display: block !important;
}
`;

  // Inject the custom context menu CSS into the page
  const style = document.createElement("style");
  style.textContent = contextMenuCSS;
  document.head.append(style);

  // Toggle contextMenu Function
  const isContextMenuActive = function () {
    const customContextMenu = document.getElementById("custom-context-menu");
    const currentContextMenuDisplay = customContextMenu.style.display;
    return currentContextMenuDisplay === "block";
  };

  // Toggle contextMenu Function
  const toggleContextMenu = function (showChildMenu = false) {
    const customContextMenu = document.getElementById("custom-context-menu");
    // customContextMenu.style.display = isContextMenuActive() ? "none" : "block";
    // isContextMenuActive() ? hideContextMenu() : (customContextMenu.style.display = "block");
    // showChildMenu && customContextMenu.classList.add('show-child-menu');

    if (isContextMenuActive()) {
      hideContextMenu();
    } else {
      showChildMenu && customContextMenu.classList.add("show-child-menu");
      customContextMenu.style.display = "block";
    }
  };

  // Hide contextMenu
  const hideContextMenu = function () {
    const customContextMenu = document.getElementById("custom-context-menu");
    customContextMenu.style.display = "none";
    customContextMenu.classList.contains("show-child-menu") &&
      customContextMenu.classList.remove("show-child-menu");
  };

  // Send message to background script
  const sendMessage = function (message) {
    console.log("message", message);
    chrome.runtime.sendMessage({ action: message });
  };

  // Get the first text node amongst the child nodes
  const getTextNodeContent = function (el) {
    if (!el) return;
    let textContent = "";
    // Use .find() to check the child nodes and return the first text node that is not empty
    textContent = Array.from(el.childNodes)
      .find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      )
      .textContent.trim();
    return textContent;
  };

  // Booleanify truthy or falsy values that takes care of empty objects
  // empty objects are truthy! => https://www.meta.ai/c/c656ae77-3e8c-4257-bfdd-0379b3bd731e, https://chatgpt.com/c/da3a4ba2-fde2-420e-82b9-8d39af97cbee
  const isNotEmpty = (value) =>
    !(!value || (typeof value === "object" && Object.keys(value).length === 0));

  // Hide the custom context menu on left-click
  document.addEventListener("click", function () {
    hideContextMenu();
  });

  // Handle click events on the custom context menu items
  document
    .getElementById("custom-context-menu")
    .addEventListener("click", function (e) {
      if (e.target.hasAttribute(`data-menu-item`)) {
        sendMessage(getTextNodeContent(e.target));
      } else {
        console.log("Nothing");
      }
    });

  /* Navigate with Alt Key */
  const menuItems = Array.from(
    document.querySelectorAll("#custom-context-menu > ul > li")
  );
  let activeMenuType = "main"; // 'main', 'left', or 'right'

  const moveVertical = (direction) => {
    let selectedItems;
    let currentItem;

    if (activeMenuType === "main") {
      selectedItems = menuItems;
      currentItem = menuItems.find((item) =>
        item.hasAttribute("data-selected")
      );
    } else {
      const activeParent = document.querySelector("[data-child-active]");
      selectedItems = Array.from(
        activeParent.querySelector(`.child-menu.${activeMenuType}`).children
      );
      currentItem = selectedItems.find((item) =>
        item.hasAttribute("data-selected")
      );
    }

    if (currentItem) {
      currentItem.removeAttribute("data-selected");
      const currentIndex = selectedItems.indexOf(currentItem);
      const newIndex =
        direction === "prev"
          ? (currentIndex - 1 + selectedItems.length) % selectedItems.length
          : (currentIndex + 1) % selectedItems.length;
      selectedItems[newIndex].setAttribute("data-selected", "");
    } else {
      selectedItems[0].setAttribute("data-selected", "");
    }
  };

  const moveHorizontalRight = () => {
    const currentItem = document.querySelector("[data-selected]");
    if (!currentItem) return;

    const parent = currentItem.closest("[data-has-child]");
    if (!parent) return;

    parent.removeAttribute("data-child-active");
    currentItem.removeAttribute("data-selected");

    if (activeMenuType === "main") {
      parent
        .querySelector(".child-menu.right")
        .parentElement.setAttribute("data-child-active", "");
      parent
        .querySelector(".child-menu.right li")
        .setAttribute("data-selected", "");
      activeMenuType = "right";
    } else if (activeMenuType === "right") {
      parent
        .querySelector(".child-menu.left")
        .parentElement.setAttribute("data-child-active", "");
      parent
        .querySelector(".child-menu.left li")
        .setAttribute("data-selected", "");
      activeMenuType = "left";
    } else {
      parent.setAttribute("data-selected", "");
      activeMenuType = "main";
    }
  };

  const moveHorizontalLeft = () => {
    const currentItem = document.querySelector("[data-selected]");
    if (!currentItem) return;

    const parent = currentItem.closest("[data-has-child]");
    if (!parent) return;

    parent.removeAttribute("data-child-active");
    currentItem.removeAttribute("data-selected");

    if (activeMenuType === "main") {
      parent
        .querySelector(".child-menu.left")
        .parentElement.setAttribute("data-child-active", "");
      parent
        .querySelector(".child-menu.left li")
        .setAttribute("data-selected", "");
      activeMenuType = "left";
    } else if (activeMenuType === "left") {
      parent
        .querySelector(".child-menu.right")
        .parentElement.setAttribute("data-child-active", "");
      parent
        .querySelector(".child-menu.right li")
        .setAttribute("data-selected", "");
      activeMenuType = "right";
    } else {
      parent.setAttribute("data-selected", "");
      activeMenuType = "main";
    }
  };

  // Track if the right Alt key is pressed
  let isRightAltPressed = false;

  // Track if the right Control key is pressed
  let isRightControlPressed = false;

  // Double tap detection for right Ctrl key
  let lastCtrlRightTap = 0;
  const doubleTapThreshold = 300; // milliseconds

  // Open Modal
  let contextModal = null;
  let contextModalOpen = false;

  // Listen for the right Alt key being pressed
  document.addEventListener("keydown", (e) => {
    // Ctrl key double tap detection
    if (e.code === "ControlRight") {
      const currentTime = new Date().getTime();
      if (currentTime - lastCtrlRightTap < doubleTapThreshold) {
        // Double tap detected
        handleDoubleTap();
      }
      lastCtrlRightTap = currentTime;
    }

    // Alt key check
    if (!isRightAltPressed && e.code === "AltRight") {
      isRightAltPressed = true;
    } else if (isRightAltPressed) {
      if (e.code === "Comma") {
        e.preventDefault();
        if (!isContextMenuActive()) {
          toggleContextMenu();
          menuItems[0].setAttribute("data-selected", "");
          activeMenuType = "main";
        } else {
          e.shiftKey ? moveVertical("prev") : moveVertical("next");
        }
      } else if (e.code === "Period") {
        e.preventDefault();
        moveHorizontalRight();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        moveHorizontalLeft();
      } else if (e.code === "ControlRight") {
        isRightControlPressed = true;

        function displayScreenshotOverlay(screenshotDataUrl) {
          // Remove any existing overlay
          const existingOverlay = document.getElementById('screenshot-overlay');
          if (existingOverlay) {
            existingOverlay.remove();
          }

          // Create overlay container
          const overlay = document.createElement('div');
          overlay.id = 'screenshot-overlay';
          overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
          `;

          // Create image element
          const img = new Image();
          img.src = screenshotDataUrl;
          img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
          `;

          // Add close button
          const closeButton = document.createElement('button');
          closeButton.textContent = 'Close';
          closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          `;
          closeButton.onclick = () => overlay.remove();

          // Append elements
          overlay.appendChild(img);
          overlay.appendChild(closeButton);
          document.body.appendChild(overlay);

          // Add click event to close overlay when clicking outside the image
          overlay.onclick = (e) => {
            if (e.target === overlay) {
              overlay.remove();
            }
          };
        }

        // Usage in your existing code
        chrome.storage.local.get('screenshotDataUrl', (data) => {
          if (data.screenshotDataUrl) {
            displayScreenshotOverlay(data.screenshotDataUrl);
          } else {
            console.log('No screenshot data found');
          }
        });

        /*
        // Lazily create the modal instance if it doesn't exist
        if (!contextModal) {
          contextModal = new modal();
        }

        // Toggle the modal
        if (!contextModalOpen) {
          contextModalOpen = true;

          chrome.storage.local.get('screenshotDataUrl', (data) => {
            const img = new Image();
            console.log("data", data);
            img.src = data.screenshotDataUrl;
            console.log("img", img);
            contextModal
              .open()
              .setContent(img);
          });
        } else {
          contextModalOpen = false;
          contextModal.close();
        }
        */
      }
    }
  });

  // Listen for the right Alt key being released
  document.addEventListener("keyup", (e) => {
    // Don't run if ALt Right and Ctrl Right keys are released so close to each other => [OPTION] use lastCtrlRightTap time or check if contextMenu is open
    // [N] I can also simply use this alone => isContextMenuActive()
    // const currentTime = new Date().getTime();
    // if (currentTime - lastCtrlRightTap >= doubleTapThreshold) {
    if (e.code === "AltRight") isRightAltPressed = false;
    if (e.code === "AltRight" && isContextMenuActive()) {
      //   isRightAltPressed = false;
      let selectedItem = document.querySelector("[data-selected]");
      document
        .querySelectorAll("[data-selected], [data-child-active]")
        .forEach((el) => {
          el.removeAttribute("data-selected");
          el.removeAttribute("data-child-active");
        });
      activeMenuType = "main";
      hideContextMenu();
      itemText = getTextNodeContent(selectedItem);
      sendMessage(itemText);
      console.log(itemText);
    }
  });

  // Resend last action if double clicked
  function handleDoubleTap() {
    console.log("Right Ctrl key double tapped");
    chrome.storage.local.get("contextMenuLastAction", function (data) {
      const lastAction = data?.contextMenuLastAction;
      lastAction ? sendMessage(lastAction) : alert("No last action to redo");
    });
  }
})();
