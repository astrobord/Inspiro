const paintingElement = document.getElementById('painting');
const artistElement = document.getElementById('artist');
const titleElement = document.getElementById('title');
const dateElement = document.getElementById('date');
const previousPaintingButton = document.getElementById('previous-painting');
const newPaintingButton = document.getElementById('new-painting');
const saveImageButton = document.getElementById('save-image');

let paintingsHistory = [];
let currentPaintingIndex = -1;
let seenPaintings = new Set();

const featuredArtists = [
    'Andrew_Wyeth', 'John_Singer_Sargent', 'Rembrandt', 'Edward_Hopper',
    'Vincent_van_Gogh', 'Claude_Monet', 'Pablo_Picasso', 'Leonardo_da_Vinci',
    'Michelangelo', 'Raphael', 'Titian', 'Caravaggio', 'Vermeer', 'Dürer',
    'Velázquez', 'Goya', 'Turner', 'Monet', 'Cézanne', 'Renoir', 'Degas'
];

function cleanText(text) {
    if (typeof text !== 'string') return '';
    text = text.replace(/<\/?[^>]+(>|$)/g, "");
    text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    return text.trim();
}

function cleanTitle(title) {
    title = cleanText(title);
    // Remove non-English characters, "title", "label", and "QS" followed by numbers
    title = title.replace(/[^\x00-\x7F]+/g, "")
                 .replace(/\b(title|label):\s*/gi, "")
                 .replace(/\bQS\d+\s*/g, "");
    // Remove everything after the first comma, semicolon, or parenthesis
    title = title.split(/[,;(]/)[0].trim();
    return title || 'Unknown';
}

function cleanArtistName(name) {
    name = cleanText(name);
    // Remove numbers and non-English characters
    name = name.replace(/\d+/g, "").replace(/[^\x00-\x7F]+/g, "").trim();
    return name || 'Unknown';
}

function cleanDate(date) {
    date = cleanText(date);
    // Extract year or century
    const yearMatch = date.match(/\b\d{4}\b/);
    const centuryMatch = date.match(/\b\d{1,2}th century\b/i);
    if (yearMatch) {
        return yearMatch[0];
    } else if (centuryMatch) {
        return centuryMatch[0];
    } else {
        return 'Unknown';
    }
}

async function fetchRandomPainting(retryCount = 0) {
    if (retryCount > 10) {
        throw new Error('Maximum retry attempts reached');
    }

    const randomArtist = featuredArtists[Math.floor(Math.random() * featuredArtists.length)];
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:Paintings_by_${randomArtist}&gcmtype=file&prop=imageinfo&iiprop=url|extmetadata|mime|size&format=json&origin=*&gcmlimit=50`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.query || !data.query.pages) {
            throw new Error('Invalid API response');
        }
        const pages = Object.values(data.query.pages);
        const validPaintings = pages.filter(page => 
            page.imageinfo && 
            page.imageinfo[0].url && 
            page.imageinfo[0].extmetadata &&
            page.imageinfo[0].extmetadata.ObjectName &&
            page.imageinfo[0].mime.startsWith('image/') &&
            !page.imageinfo[0].mime.includes('pdf') &&
            isPaintingBetween1400And1999(page.imageinfo[0].extmetadata.DateTimeOriginal) &&
            !seenPaintings.has(page.imageinfo[0].url)
        );

        if (validPaintings.length === 0) {
            return fetchRandomPainting(retryCount + 1);
        }

        // Sort paintings by size (largest first)
        validPaintings.sort((a, b) => {
            const aSize = a.imageinfo[0].width * a.imageinfo[0].height;
            const bSize = b.imageinfo[0].width * b.imageinfo[0].height;
            return bSize - aSize;
        });

        // Select a painting from the top 25% largest images
        const topQuarter = Math.max(1, Math.floor(validPaintings.length / 4));
        const painting = validPaintings[Math.floor(Math.random() * topQuarter)];
        const metadata = painting.imageinfo[0].extmetadata;
        
        const artistName = cleanArtistName(metadata.Artist ? metadata.Artist.value : randomArtist.replace(/_/g, ' '));
        const paintingData = {
            url: painting.imageinfo[0].url,
            artist: artistName,
            title: metadata.ObjectName ? cleanTitle(metadata.ObjectName.value) : 'Unknown',
            date: metadata.DateTimeOriginal ? cleanDate(metadata.DateTimeOriginal.value) : 'Unknown',
            artistUrl: `https://en.wikipedia.org/wiki/${randomArtist}`
        };

        seenPaintings.add(paintingData.url);
        currentPaintingIndex++;
        paintingsHistory = paintingsHistory.slice(0, currentPaintingIndex);
        paintingsHistory.push(paintingData);

        displayPainting(paintingData);
        updateButtonStates();
    } catch (error) {
        console.error('Error fetching painting:', error);
        return fetchRandomPainting(retryCount + 1);
    }
}

function isPaintingBetween1400And1999(dateString) {
    if (!dateString || !dateString.value) return true; // If no date, assume it's within range
    const year = parseInt(dateString.value.match(/\d{4}/));
    return !isNaN(year) && year >= 1400 && year <= 1999;
}

function displayPainting(paintingData) {
    paintingElement.src = paintingData.url;
    artistElement.innerHTML = `Artist: <a href="${paintingData.artistUrl}" target="_blank">${paintingData.artist || 'Unknown'}</a>`;
    titleElement.textContent = `Title: ${paintingData.title || 'Unknown'}`;
    dateElement.textContent = `Date: ${paintingData.date || 'Unknown'}`;
}

function showPreviousPainting() {
    if (currentPaintingIndex > 0) {
        currentPaintingIndex--;
        displayPainting(paintingsHistory[currentPaintingIndex]);
        updateButtonStates();
    }
}

function updateButtonStates() {
    previousPaintingButton.disabled = currentPaintingIndex === 0;
}

function saveImage() {
    const link = document.createElement('a');
    link.href = paintingElement.src;
    link.download = 'inspiro_painting.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

previousPaintingButton.addEventListener('click', showPreviousPainting);
newPaintingButton.addEventListener('click', () => fetchRandomPainting());
saveImageButton.addEventListener('click', saveImage);

// Load initial painting
fetchRandomPainting();
