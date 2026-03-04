async function requestAutocomplete(backendUrl, payload) {
  const response = await fetch(`${backendUrl}/autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  return (data.completion || "").trim();
}

module.exports = {
  requestAutocomplete,
};
