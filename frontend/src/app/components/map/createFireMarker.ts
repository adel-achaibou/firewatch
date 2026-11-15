import fireIconUrl from "../../assets/icons/fire.svg";

// Create a custom fire marker
export function createFireMarker(isSelected: boolean, fireNumber: number, compact = false, fireId?: string): HTMLDivElement {

    // Main marker container
    const marker = document.createElement("div");

    if (fireId) {
    marker.dataset.fireId = fireId;
    }

    marker.style.display = "flex";
    marker.style.alignItems = "center";
    marker.style.justifyContent = "center";
    marker.style.borderRadius = "50%";
    marker.style.cursor = "pointer";
    marker.style.boxSizing = "border-box";

    // Change appearance depending on selection
    if (isSelected) {

        marker.style.width = compact ? "28px" : "48px";
        marker.style.height = compact ? "28px" : "48px";
        marker.style.backgroundColor = "#2563EB";
        marker.style.border = "3px solid #93C5FD";
        marker.style.boxShadow = "0 0 0 7px rgba(59, 130, 246, 0.20)";

    } else {

        marker.style.width = compact ? "19px" : "34px";
        marker.style.height = compact ? "19px" : "34px";
        marker.style.backgroundColor = "#F97316";
        marker.style.border = "2px solid #FED7AA";
    }

    // Fire icon
    const fireIcon = document.createElement("img");

    fireIcon.src = fireIconUrl;
    fireIcon.alt = "";
    fireIcon.width = isSelected ? (compact ? 16 : 27) : (compact ? 12 : 20);
    fireIcon.height = isSelected ? (compact ? 16 : 27) : (compact ? 12 : 20);

    marker.appendChild(fireIcon);

    // Number badge for selected fires
    if (isSelected) {

        const badge = document.createElement("span");

        badge.textContent = fireNumber.toString();
        badge.style.position = "absolute";
        badge.style.top = compact ? "-5px" : "-8px";
        badge.style.right = compact ? "-5px" : "-8px";
        badge.style.minWidth = compact ? "16px" : "22px";
        badge.style.height = compact ? "16px" : "22px";
        badge.style.padding = "0 4px";
        badge.style.boxSizing = "border-box";
        badge.style.display = "flex";
        badge.style.alignItems = "center";
        badge.style.justifyContent = "center";
        badge.style.borderRadius = "9999px";
        badge.style.backgroundColor = "white";
        badge.style.color = "#2563EB";
        badge.style.border = "2px solid #2563EB";
        badge.style.fontSize = compact ? "9px" : "12px";
        badge.style.fontWeight = "bold";

        marker.appendChild(badge);
    }

    return marker;
}

