function getYouTubeVideoId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match && match[1];
}

function convertLink() {
    const youtubeLink = document.getElementById("youtubeLink").value;
    const videoId = getYouTubeVideoId(youtubeLink);

    if (videoId) {
        const encodedId = btoa(videoId);
        const newLink = `https://sprow.dev/tools/1?lid=${encodedId}`;
        document.getElementById("result").innerHTML = `<a href="${newLink}" target="_blank">${newLink}</a>`;
    } else {
        document.getElementById("result").textContent = "Invalid YouTube link.";
    }
}

function copyResultText() {
    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    const textToCopy = resultDiv.textContent;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
            .then(() => console.log("Text copied to clipboard"))
            .catch(() => fallbackCopyText(textToCopy));
    } else {
        fallbackCopyText(textToCopy);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";

    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand("copy");
    } catch (_) {}

    document.body.removeChild(textArea);
}