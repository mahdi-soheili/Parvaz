const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// API endpoint برای جستجوی پروازها
app.get('/api/search-flights', async (req, res) => {
    try {
        const { origin, destination, date, passengers } = req.query;
        
        // تبدیل تاریخ شمسی به میلادی
        const gregorianDate = convertShamsiToGregorian(date);
        
        // ایجاد درخواست‌ها برای تمام سایت‌ها
        const sites = [
            { name: 'SnappTrip', url: 'https://www.snapptrip.com/api/v1/flights/search' },
            { name: 'MrBilit', url: 'https://mrbilit.com/api/v2/flights/search' },
            { name: 'Alibaba', url: 'https://www.alibaba.ir/api/v1/flights/search' },
            { name: 'FlyToday', url: 'https://www.flytoday.ir/api/v1/flights/search' },
            { name: 'Flightio', url: 'https://flightio.com/api/v2/flights/search' }
        ];
        
        const results = await Promise.allSettled(
            sites.map(site => fetchFlightPrice(site, origin, destination, gregorianDate, passengers))
        );
        
        // پردازش نتایج
        const validResults = results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
        
        res.json(validResults);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
    }
});

// تابع برای دریافت قیمت از یک سایت
async function fetchFlightPrice(site, origin, destination, date, passengers) {
    try {
        const params = new URLSearchParams({
            origin,
            destination,
            departureDate: date,
            adults: passengers,
            children: 0,
            infants: 0,
            cabinClass: 'Economy'
        });
        
        const response = await axios.get(`${site.url}?${params}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // استخراج قیمت از پاسخ (این بخش باید برای هر سایت تنظیم شود)
        let price = null;
        if (site.name === 'SnappTrip' && response.data.data?.flights?.length > 0) {
            price = Math.min(...response.data.data.flights.map(f => f.price.amount));
        } else if (site.name === 'MrBilit' && response.data.flights?.length > 0) {
            price = Math.min(...response.data.flights.map(f => f.price));
        } else if (site.name === 'Alibaba' && response.data.result?.flights?.length > 0) {
            price = Math.min(...response.data.result.flights.map(f => f.price));
        } else if (site.name === 'FlyToday' && response.data.data?.flights?.length > 0) {
            price = Math.min(...response.data.data.flights.map(f => f.price));
        } else if (site.name === 'Flightio' && response.data.flights?.length > 0) {
            price = Math.min(...response.data.flights.map(f => f.price));
        }
        
        if (price) {
            return {
                site: site.name,
                price: price,
                url: site.url.replace('/api', '')
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error fetching from ${site.name}:`, error.message);
        return null;
    }
}

// تابع برای تبدیل تاریخ شمسی به میلادی
function convertShamsiToGregorian(shamsiDate) {
    const [year, month, day] = shamsiDate.split('/').map(Number);
    const gDate = new Date(year + 621, month - 1, day);
    return gDate.toISOString().split('T')[0];
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
