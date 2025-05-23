const SUPABASE_URL = 'SUPABASE_URL_REMOVED';
const SUPABASE_KEY = 'SUPABASE_KEY_REDACTED';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// days on the road part

    const startDate = new Date('2024-01-28'); // YYYY-MM-DD format is best for consistency
    const currentDate = new Date();
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysOnRoad = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    document.getElementById('daysOnRoad').textContent = daysOnRoad + 1;

//number of flights
async function getFlightCount() {
        try {
            const { count, error } = await supabaseClient
                .from('cost_transport')
                .select('*', { count: 'exact', head: true }) // 'head: true' makes it a HEAD request for performance, 'exact' for exact count
                .eq('type of transport', 'flight'); // Filter where 'type of transport' column equals 'flight'

            if (error) {
                console.error('Error fetching flight count:', error.message);
                document.getElementById('numberOfFlights').textContent = 'Error!';
                return;
            }

            document.getElementById('numberOfFlights').textContent = count;

        } catch (err) {
            console.error('An unexpected error occurred:', err);
            document.getElementById('numberOfFlights').textContent = 'Error!';
        }
    }

    getFlightCount();

