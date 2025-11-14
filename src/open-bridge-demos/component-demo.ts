/**
 * Dynamically import all OpenBridge components and display them with import/deploy buttons.
 */
const componentModules = import.meta.glob(
  "/node_modules/@oicl/openbridge-webcomponents/dist/components/*/*.js",
);

for (const path in componentModules) {
  componentModules[path]();
}

const componentNames = Object.keys(componentModules)
  .map((path) => {
    // Extract the component name from the file path
    // e.g. .../icon-button/icon-button.js => icon-button
    const match = path.match(/components\/([a-z0-9-]+)\/\1\.js$/i);
    return match ? match[1] : null;
  })
  .filter(Boolean);

const container = document.getElementById("component-demo");

componentNames.forEach((name) => {
  // Try to create the component element
  const tag = `obc-${name}`;
  let componentEl: HTMLElement;
  try {
    componentEl = document.createElement(tag);
    // Add some demo content for known components
    if (tag === "obc-icon-button") {
      componentEl.innerHTML = "<obi-route-export-iec></obi-route-export-iec>";
      (componentEl as any).title = "Demo Icon Button";
    }
    if (tag === "obc-context-menu") {
      componentEl.innerHTML = "<div>Menu Item 1</div><div>Menu Item 2</div>";
    }
    if (tag === "obc-divider") {
      (componentEl as any).style.margin = "8px 0";
    }
    // Add more demo content for other components as needed
  } catch {
    componentEl = document.createElement("div");
    componentEl.textContent = `Could not render ${tag}`;
  }

  // Label
  const label = document.createElement("div");
  label.textContent = tag;
  label.className = "component-label";

  // Button row
  const buttonRow = document.createElement("div");
  buttonRow.className = "component-btn-row";

  // Import button
  const importBtn = document.createElement("button");
  importBtn.textContent = "i";
  importBtn.title = "Copy import statement";
  importBtn.onclick = () => {
    const importStatement = `import "@oicl/openbridge-webcomponents/dist/components/${name}/${name}";`;
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
  wrapper.className = "component-wrapper";
  wrapper.appendChild(componentEl);
  wrapper.appendChild(label);
  wrapper.appendChild(buttonRow);

  container.appendChild(wrapper);
});
