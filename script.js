// 1. Supabase Initialization
//    REPLACE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // e.g., 'eyJ...'

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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

    // Days on the Road (simple approach: earliest check-in to latest check-out/transport date)
    let allDates = [];
    accommodationData.forEach(acc => {
        if (acc.check_in) allDates.push(new Date(acc.check_in));
        if (acc.check_out) allDates.push(new Date(acc.check_out));
    });
    transportData.forEach(trans => {
        if (trans.date) allDates.push(new Date(trans.date));
        if (trans.departure_date) allDates.push(new Date(trans.departure_date));
        if (trans.arrival_date) allDates.push(new Date(trans.arrival_date));
    });

    if (allDates.length > 0) {
        const earliestDate = new Date(Math.min(...allDates));
        const latestDate = new Date(Math.max(...allDates));
        const today = new Date();
        const endDateForCalc = latestDate > today ? latestDate : today; // If travel is ongoing, use today. Otherwise, use last recorded date.

        const timeDiff = Math.abs(endDateForCalc.getTime() - earliestDate.getTime());
        const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        daysOnRoadEl.textContent = days + ' days';
    } else {
        daysOnRoadEl.textContent = 'N/A';
    }


    // Nr of Flights Taken
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

// 7. Initial Load
document.addEventListener('DOMContentLoaded', calculateAndDisplayStats);
