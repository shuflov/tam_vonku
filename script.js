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

//unique places
async function getUniquePlacesCount() {
    try {
        const { data, error } = await supabaseClient
            .from('cost_accommodation')
            .select('accommodationName'); 

        if (error) {
            console.error('Error fetching all places for unique count:', error.message);
            document.getElementById('uniquePlaces').textContent = 'Error!';
            return;
        }

        if (!data || data.length === 0) {
            document.getElementById('uniquePlaces').textContent = 0;
            return;
        }

        const allPlaces = data.map(item => item.accommodationName);
        const uniquePlacesSet = new Set(allPlaces);
        const uniquePlacesCount = uniquePlacesSet.size;
        document.getElementById('uniquePlaces').textContent = uniquePlacesCount; //norway

    } catch (err) {
        console.error('An unexpected error occurred while processing unique places:', err);
        document.getElementById('uniquePlaces').textContent = 'Error!';
    }
}
    getUniquePlacesCount();

//number of visited countries
async function getUniqueCountriesCount() {
    try {
        const { data, error } = await supabaseClient
            .from('cost_accommodation')
            .select('country'); 

        if (error) {
            console.error('Error fetching all countries for unique count:', error.message);
            document.getElementById('country').textContent = 'Error!';
            return;
        }

        if (!data || data.length === 0) {
            document.getElementById('country').textContent = 0;
            return;
        }

        const allCountries = data.map(item => item.country);
        const uniqueCountriesSet = new Set(allCountries);
        const uniqueCountryCount = uniqueCountriesSet.size;
        document.getElementById('country').textContent = uniqueCountryCount + 1; //norway

    } catch (err) {
        console.error('An unexpected error occurred while processing unique countries:', err);
        document.getElementById('country').textContent = 'Error!';
    }
}
getUniqueCountriesCount();

// average price per person per night - whole trip
    async function calculateAveragePricePerNight() {
  // Step 1: Wait for daysOnRoad to be filled
  const daysElem = document.getElementById('daysOnRoad')
  
  // Wait until daysOnRoad has a number (optional retry loop for dynamic pages)
  let days = null
  for (let i = 0; i < 10; i++) {
    const parsed = parseInt(daysElem.textContent)
    if (!isNaN(parsed)) {
      days = parsed
      break
    }
    await new Promise(r => setTimeout(r, 300)) // wait 300ms
  }

  if (!days || days <= 0) {
    document.getElementById('avgPricePerNight').textContent = 'N/A'
    return
  }

  // Step 2: Fetch total cost
  const { data, error } = await supabaseClient
    .from('cost_accommodation')
    .select('"total price of stay"')

  if (error) {
    console.error('Error fetching data:', error)
    document.getElementById('avgPricePerNight').textContent = 'Error'
    return
  }

  // Step 3: Calculate total cost
  const totalSpent = data.reduce((sum, entry) => sum + (entry["total price of stay"] || 0), 0)
  const avgPrice = (totalSpent / days).toFixed(2)

  document.getElementById('avgPricePerNight').textContent = `€ ${avgPrice/2}`
}

calculateAveragePricePerNight()
