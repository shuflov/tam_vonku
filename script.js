// supabase-config.js
const SUPABASE_URL = 'SUPABASE_URL_REMOVED';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED';

// Initialize the Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Export the client if using modules
// export { supabaseClient };

// 2. DOM Elements
const daysOnRoadEl = document.getElementById('daysOnRoad');
const flightsTakenEl = document.getElementById('flightsTaken');
const uniquePlacesEl = document.getElementById('uniquePlaces');
const avgPricePerNightEl = document.getElementById('avgPricePerNight');

const accommodationTableBody = document.querySelector('#accommodationTable tbody');
const transportTableBody = document.querySelector('#transportTable tbody');

// 3. Helper Functions

// Formats a date string (YYYY-MM-DD)
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Calculates nights between check-in and check-out
function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
}

// 4. Fetching Data from Supabase

async function fetchAccommodationData() {
    const { data, error } = await supabaseClient
        .from('cost_accommodation')
        .select('*')
        .order('check_in', { ascending: false }); // Assuming 'check_in' column exists

    if (error) {
        console.error('Error fetching accommodation data:', error.message);
        return [];
    }
    return data;
}

async function fetchTransportData() {
    const { data, error } = await supabaseClient
        .from('cost_transport')
        .select('*')
        .order('date', { ascending: false }); // Assuming a 'date' column exists for transport

    if (error) {
        console.error('Error fetching transport data:', error.message);
        return [];
    }
    return data;
}

// 5. Populate Tables

function populateAccommodationTable(records) {
    accommodationTableBody.innerHTML = ''; // Clear existing rows
    records.forEach(record => {
        const row = accommodationTableBody.insertRow();
        const nights = calculateNights(record.check_in, record.check_out);
        row.insertCell().textContent = record.location || 'N/A'; // Adjust column names based on your Supabase table
        row.insertCell().textContent = formatDate(record.check_in);
        row.insertCell().textContent = formatDate(record.check_out);
        row.insertCell().textContent = nights;
        row.insertCell().textContent = (record.price ? record.price.toFixed(2) : '0.00'); // Assuming a 'price' column
        row.insertCell().textContent = record.description || ''; // Assuming a 'description' column
    });
}

function populateTransportTable(records) {
    transportTableBody.innerHTML = ''; // Clear existing rows
    records.forEach(record => {
        const row = transportTableBody.insertRow();
        row.insertCell().textContent = record['type of transport'] || 'N/A'; // Using the quoted column name
        row.insertCell().textContent = formatDate(record.departure_date || record.date); // Assuming a 'departure_date' or 'date' column
        row.insertCell().textContent = formatDate(record.arrival_date || ''); // Assuming an 'arrival_date' column
        row.insertCell().textContent = (record.cost ? record.cost.toFixed(2) : '0.00'); // Assuming a 'cost' column
        row.insertCell().textContent = record.description || ''; // Assuming a 'description' column
    });
}

// 6. Calculate Statistics

async function calculateAndDisplayStats() {
    const accommodationData = await fetchAccommodationData();
    const transportData = await fetchTransportData();

    // --- Start: MODIFIED SECTION FOR DAYS ON THE ROAD ---
    const fixedStartDate = new Date('2024-01-28'); // Your fixed start date
    const today = new Date(); // Get today's date

    // Set both dates to UTC midnight to avoid timezone issues when calculating days
    fixedStartDate.setUTCHours(0, 0, 0, 0);
    today.setUTCHours(0, 0, 0, 0);

    // Calculate the difference in milliseconds
    const timeDiff = Math.abs(today.getTime() - fixedStartDate.getTime());

    // Convert milliseconds to days
    // Math.ceil ensures partial days count as a full day (e.g., if you started yesterday, it's 1 day)
    const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    daysOnRoadEl.textContent = days + ' days';
    // --- End: MODIFIED SECTION FOR DAYS ON THE ROAD ---

    // Nr of Flights Taken (this should still work)
    const flights = transportData.filter(t => t['type of transport'] && t['type of transport'].toLowerCase() === 'flight');
    flightsTakenEl.textContent = flights.length;

    // Different Places of Stay
    const uniqueLocations = new Set(accommodationData.map(acc => acc.location).filter(Boolean));
    uniquePlacesEl.textContent = uniqueLocations.size;

    // Average Price per Night
    let totalNights = 0;
    let totalAccommodationCost = 0;
    accommodationData.forEach(acc => {
        const nights = calculateNights(acc.check_in, acc.check_out);
        if (nights > 0 && acc.price) {
            totalNights += nights;
            totalAccommodationCost += acc.price;
        }
    });

    if (totalNights > 0) {
        avgPricePerNightEl.textContent = (totalAccommodationCost / totalNights).toFixed(2) + ' €';
    } else {
        avgPricePerNightEl.textContent = 'N/A';
    }

    // Populate tables after stats (optional, but good for sequential loading)
    populateAccommodationTable(accommodationData);
    populateTransportTable(transportData);
}

    // Different Places of Stay
    const uniqueLocations = new Set(accommodationData.map(acc => acc.location).filter(Boolean));
    uniquePlacesEl.textContent = uniqueLocations.size;

    // Average Price per Night
    let totalNights = 0;
    let totalAccommodationCost = 0;
    accommodationData.forEach(acc => {
        const nights = calculateNights(acc.check_in, acc.check_out);
        if (nights > 0 && acc.price) {
            totalNights += nights;
            totalAccommodationCost += acc.price;
        }
    });

    if (totalNights > 0) {
        avgPricePerNightEl.textContent = (totalAccommodationCost / totalNights).toFixed(2) + ' €';
    } else {
        avgPricePerNightEl.textContent = 'N/A';
    }

    // Populate tables after stats (optional, but good for sequential loading)
    populateAccommodationTable(accommodationData);
    populateTransportTable(transportData);
}

// 7. Initial Load
document.addEventListener('DOMContentLoaded', calculateAndDisplayStats);
