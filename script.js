const SUPABASE_URL = 'SUPABASE_URL_REMOVED';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// days on the road part
    // Set the start date of the journey
    const startDate = new Date('2024-01-28'); // YYYY-MM-DD format is best for consistency

    // Get the current date
    const currentDate = new Date();

    // Calculate the difference in milliseconds
    const timeDiff = currentDate.getTime() - startDate.getTime();

    // Convert milliseconds to days
    // 1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    const daysOnRoad = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    // Display the number of days in the HTML element
    document.getElementById('daysOnRoad').textContent = daysOnRoad;
