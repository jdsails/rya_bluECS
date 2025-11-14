/**
 * Dynamically import all OpenBridge Navigation Instruments and display them with import/deploy buttons.
 */
const instrumentModules = import.meta.glob(
  "/node_modules/@oicl/openbridge-webcomponents/dist/navigation-instruments/*/*.js",
);

for (const path in instrumentModules) {
  instrumentModules[path]();
}

const instrumentNames = Object.keys(instrumentModules)
  .map((path) => {
    // Extract the instrument name from the file path
    // e.g. .../icon-button/icon-button.js => icon-button
    const match = path.match(/navigation-instruments\/([a-z0-9-]+)\/\1\.js$/i);
    return match ? match[1] : null;
  })
  .filter(Boolean);

const container = document.getElementById("navigation-instruments-demo");

instrumentNames.forEach((name) => {
  // Try to create the instrument element
  const tag = `obc-${name}`;
  let instrumentEL: HTMLElement;
  try {
    instrumentEL = document.createElement(tag);
    // Add some demo content for known navigation instruments
    if (tag === "obc-icon-button") {
      instrumentEL.innerHTML = "<obi-route-export-iec></obi-route-export-iec>";
      (instrumentEL as any).title = "Demo Button";
    }
    if (tag === "obc-context-menu") {
      instrumentEL.innerHTML = "<div>Menu Item 1</div><div>Menu Item 2</div>";
    }
    if (tag === "obc-divider") {
      (instrumentEL as any).style.margin = "8px 0";
    }
    // Add more demo content for other instruments as needed
  } catch {
    instrumentEL = document.createElement("div");
    instrumentEL.textContent = `Could not render ${tag}`;
  }

  // Label
  const label = document.createElement("div");
  label.textContent = tag;
  label.className = "instrument-label";

  // Button row
  const buttonRow = document.createElement("div");
  buttonRow.className = "instrument-btn-row";

  // Import button
  const importBtn = document.createElement("button");
  importBtn.textContent = "i";
  importBtn.title = "Copy import statement";
  importBtn.onclick = () => {
    const importStatement = `import "@oicl/openbridge-webcomponents/dist/navigation-instruments/${name}/${name}";`;
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
  wrapper.className = "instrument-wrapper";
  wrapper.appendChild(instrumentEL);
  wrapper.appendChild(label);
  wrapper.appendChild(buttonRow);

  container.appendChild(wrapper);
});
