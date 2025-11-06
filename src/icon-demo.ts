import "@oicl/openbridge-webcomponents/dist/components/icon-button/icon-button";

// Dynamically import all icons in the icons directory
const iconModules = import.meta.glob(
  "/node_modules/@oicl/openbridge-webcomponents/dist/icons/icon-*.js",
);

for (const path in iconModules) {
  iconModules[path]();
}
const iconNames = Object.keys(iconModules)
  .map((path) => {
    // Extract the icon name from the file path
    const match = path.match(/icon-([a-z0-9-]+)\.js$/i);
    return match ? match[1] : null;
  })
  .filter(Boolean);

const container = document.getElementById("icon-demo");

iconNames.forEach((name) => {
  const btn = document.createElement("obc-icon-button");
  btn.style.margin = "8px";
  btn.innerHTML = `<obi-${name}></obi-${name}>`;

  const label = document.createElement("div");
  label.textContent = `obi-${name}`;
  label.style.fontSize = "12px";
  label.style.textAlign = "center";
  label.style.marginBottom = "8px";
  label.style.wordBreak = "break-all";
  label.style.maxWidth = "120px";

  // Create button row
  const buttonRow = document.createElement("div");
  buttonRow.style.display = "flex";
  buttonRow.style.justifyContent = "center";
  buttonRow.style.gap = "6px";
  buttonRow.style.marginBottom = "8px";

  // Import button
  const importBtn = document.createElement("button");
  importBtn.textContent = "i";
  importBtn.title = "Copy import statement";
  importBtn.style.padding = "2px 6px";
  importBtn.style.fontSize = "12px";
  importBtn.style.cursor = "pointer";
  importBtn.onclick = () => {
    const importPath = `/node_modules/@oicl/openbridge-webcomponents/dist/icons/icon-${name}.js`;
    const importStatement = `import "@oicl/openbridge-webcomponents/dist/icons/icon-${name}";`;
    navigator.clipboard.writeText(importStatement);
    importBtn.textContent = "✓";
    setTimeout(() => (importBtn.textContent = "i"), 1000);
  };

  // Deploy button
  const deployBtn = document.createElement("button");
  deployBtn.textContent = "d";
  deployBtn.title = "Copy deploy HTML";
  deployBtn.style.padding = "2px 6px";
  deployBtn.style.fontSize = "12px";
  deployBtn.style.cursor = "pointer";
  deployBtn.onclick = () => {
    const deployHTML = `<obc-icon-button id="change" title="title" disabled><obi-${name}></obi-${name}></obc-icon-button>`;
    navigator.clipboard.writeText(deployHTML);
    deployBtn.textContent = "✓";
    setTimeout(() => (deployBtn.textContent = "d"), 1000);
  };

  buttonRow.appendChild(importBtn);
  buttonRow.appendChild(deployBtn);

  const wrapper = document.createElement("div");
  wrapper.style.display = "inline-block";
  wrapper.style.textAlign = "center";
  wrapper.style.verticalAlign = "top";
  wrapper.style.margin = "12px";
  wrapper.style.padding = "12px";
  wrapper.style.border = "1px solid #eee";
  wrapper.style.borderRadius = "8px";
  wrapper.style.width = "140px";
  wrapper.style.boxSizing = "border-box";
  wrapper.appendChild(btn);
  wrapper.appendChild(label);
  wrapper.appendChild(buttonRow);

  container.appendChild(wrapper);
});
