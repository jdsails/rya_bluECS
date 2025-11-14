/**
 * Dynamically import all OpenBridge automations and display them with import/deploy buttons.
 */
const automationModules = import.meta.glob(
  "/node_modules/@oicl/openbridge-webcomponents/dist/automation/*/*.js",
);

for (const path in automationModules) {
  automationModules[path]();
}

const automationNames = Object.keys(automationModules)
  .map((path) => {
    // Extract the automation name from the file path
    // e.g. .../icon-button/icon-button.js => icon-button
    const match = path.match(/automation\/([a-z0-9-]+)\/\1\.js$/i);
    return match ? match[1] : null;
  })
  .filter(Boolean);

const container = document.getElementById("automation-demo");

automationNames.forEach((name) => {
  // Try to create the automation element
  const tag = `obc-${name}`;
  let automationEl: HTMLElement;
  try {
    automationEl = document.createElement(tag);
    // Add some demo content for known automations
    if (tag === "obc-icon-button") {
      automationEl.innerHTML = "<obi-route-export-iec></obi-route-export-iec>";
      (automationEl as any).title = "Demo Icon Button";
    }
    if (tag === "obc-context-menu") {
      automationEl.innerHTML = "<div>Menu Item 1</div><div>Menu Item 2</div>";
    }
    if (tag === "obc-divider") {
      (automationEl as any).style.margin = "8px 0";
    }
    // Add more demo content for other automations as needed
  } catch {
    automationEl = document.createElement("div");
    automationEl.textContent = `Could not render ${tag}`;
  }

  // Label
  const label = document.createElement("div");
  label.textContent = tag;
  label.className = "automation-label";

  // Button row
  const buttonRow = document.createElement("div");
  buttonRow.className = "automation-btn-row";

  // Import button
  const importBtn = document.createElement("button");
  importBtn.textContent = "i";
  importBtn.title = "Copy import statement";
  importBtn.onclick = () => {
    const importStatement = `import "@oicl/openbridge-webcomponents/dist/automation/${name}/${name}";`;
    navigator.clipboard.writeText(importStatement);
    importBtn.textContent = "✓";
    setTimeout(() => (importBtn.textContent = "i"), 1000);
  };

  // Deploy button
  const deployBtn = document.createElement("button");
  deployBtn.textContent = "d";
  deployBtn.title = "Copy deploy HTML";
  deployBtn.onclick = () => {
    const deployHTML = `<${tag} id="change" title="title"></${tag}>`;
    navigator.clipboard.writeText(deployHTML);
    deployBtn.textContent = "✓";
    setTimeout(() => (deployBtn.textContent = "d"), 1000);
  };

  buttonRow.appendChild(importBtn);
  buttonRow.appendChild(deployBtn);

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "automation-wrapper";
  wrapper.appendChild(automationEl);
  wrapper.appendChild(label);
  wrapper.appendChild(buttonRow);

  container.appendChild(wrapper);
});
