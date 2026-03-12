# Modern Delivery UI - Integration Guide

## Quick Start

### 1. Install/Update CSS
Add the glass morphism CSS to your main CSS file or import it in your app:

```tsx
// In your main App.tsx or index.tsx
import './styles/glass-morphism.css';
```

### 2. Replace ArrangeDelivery Page

**Before (Old):**
```tsx
// pages/ArrangeDelivery.jsx
import VehicleSelection from '../components/VehicleSelection';
import DeliveryLocationForm from '../components/DeliveryLocationForm';
```

**After (New):**
```tsx
// pages/ArrangeDeliveryModern.tsx
import DeliveryVehicleSelector from '../components/DeliveryVehicleSelector';
import { LocationDisplay } from '../components/LocationCard';
```

### 3. Update Dashboard Links

```tsx
// In Dashboard.tsx or Navigation
<Link to="/arrange-delivery-modern">
    Arrange Delivery (New)
</Link>
```

## Migration Checklist

- [ ] Import glass morphism CSS
- [ ] Create new delivery route
- [ ] Update navigation menu
- [ ] Test on mobile devices
- [ ] Test on tablets
- [ ] Test on desktop
- [ ] Update existing vehicle selection usage
- [ ] Migrate price calculations to `deliveryUtils.ts`
- [ ] Update API integration if needed
- [ ] Test with real location data

## Component Migration

### From VehicleSelection → DeliveryVehicleSelector

**Old Code:**
```tsx
<VehicleSelection
    vehicles={vehicles}
    selectedVehicle={selectedVehicle}
    onVehicleSelect={onVehicleSelect}
    distanceKm={distance}
    totalKg={weight}
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
/>
```

**New Code:**
```tsx
<DeliveryVehicleSelector
    vehicles={vehicles}
    selectedVehicle={selectedVehicle}
    onVehicleSelect={onVehicleSelect}
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
    distanceKm={distance}
    totalKg={weight}
    onDistanceCalculated={setDistance}  // Auto-calculates distance!
/>
```

### From DeliveryLocationForm → LocationDisplay

**Old Code:**
```tsx
<DeliveryLocationForm
    onLocationChange={handlePickupChange}
    initialLocation={pickupLocation}
/>
<DeliveryLocationForm
    onLocationChange={handleDropChange}
    initialLocation={dropLocation}
/>
```

**New Code:**
```tsx
<LocationDisplay
    pickupLocation={pickupLocation}
    dropLocation={dropLocation}
    onEditPickup={handleEditPickup}
    onEditDrop={handleEditDrop}
/>
```

## Integration Points

### 1. Location Provider
If you're using a context or provider for locations:

```tsx
// In your DeliveryContext or similar
const [locations, setLocations] = useState({
    pickup: { latitude: null, longitude: null, address: '', ... },
    drop: { latitude: null, longitude: null, address: '', ... }
});

<DeliveryVehicleSelector
    pickupLocation={locations.pickup}
    dropLocation={locations.drop}
    onDistanceCalculated={(distance) => {
        setLocations(prev => ({
            ...prev,
            distance
        }));
    }}
/>
```

### 2. Order Management
Connect to your order/checkout flow:

```tsx
const handleConfirmDelivery = async () => {
    if (!selectedVehicle || !calculatedDistance) {
        toast.error('Please select a vehicle');
        return;
    }

    const deliveryData = {
        vehicleId: selectedVehicle.id,
        pickupLocation: pickupLocation,
        dropLocation: dropLocation,
        distance: calculatedDistance,
        weight: totalKg,
        estimatedFee: calculateDeliveryFee(selectedVehicle, calculatedDistance, totalKg),
        eta: calculateETA(calculatedDistance, totalKg, selectedVehicle.capacity)
    };

    // Save to order
    await api.createDelivery(orderId, deliveryData);
    
    // Navigate to checkout
    navigate('/checkout', { state: { deliveryData } });
};
```

### 3. Utilities Usage

```tsx
import {
    calculateDistance,
    calculateDeliveryFee,
    calculateETA,
    formatCost,
    getCostRange,
    getRecommendedVehicle
} from '../utils/deliveryUtils';

// Auto-calculate distance
useEffect(() => {
    if (pickupLocation.latitude && dropLocation.latitude) {
        const distance = calculateDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            dropLocation.latitude,
            dropLocation.longitude
        );
        setCalculatedDistance(distance);
    }
}, [pickupLocation, dropLocation]);

// Calculate delivery fee for selected vehicle
const deliveryFee = calculateDeliveryFee(
    calculatedDistance,
    totalKg,
    selectedVehicle.basePrice,
    selectedVehicle.perKmPrice,
    selectedVehicle.perKgPrice,
    selectedVehicle.minPrice
);

// Get recommended vehicle
const recommendedId = getRecommendedVehicle(
    vehicles,
    calculatedDistance,
    totalKg
);
```

## Styling Customization

### Change Primary Colors

Open `glass-morphism.css` and update the gradient colors:

```css
/* Original */
from-blue-500 to-indigo-500

/* Custom Brand Color */
from-[your-color]-500 to-[your-color]-600
```

### Adjust Dark Theme

```css
/* In your tailwind config, update bg colors */
bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950

/* Or create custom colors */
$dark-bg: #0f1419  /* Custom dark background */
```

### Modify Card Styling

```tsx
// In DeliveryVehicleSelector.tsx or override class
<div className="backdrop-blur-2xl bg-white/[0.15]">
    {/* Adjust opacity and blur for different effect */}
</div>
```

## Mobile Optimization

### Bottom Sheet for Selected Vehicle

The component already includes a fixed bottom summary on mobile. To customize:

```tsx
// In DeliveryVehicleSelector.tsx
<div className="fixed bottom-0 left-0 right-0 
               md:relative md:bg-transparent md:border-t-0 md:p-6 
               md:mt-8 rounded-t-3xl md:rounded-3xl">
```

### Adjust Safe Area for iOS

```css
/* In glass-morphism.css */
@supports (padding: max(0px)) {
    .mobile-bottom-safe {
        padding-bottom: max(1rem, env(safe-area-inset-bottom));
    }
}
```

## Testing Checklist

### Desktop
- [ ] Full screen responsive layout
- [ ] All cards visible simultaneously
- [ ] Hover effects work smoothly
- [ ] Glass effect displays correctly

### Tablet
- [ ] 2-column layout adjusts properly
- [ ] Touch targets are adequate (min 44px)
- [ ] No overflow on smaller tablets

### Mobile
- [ ] Single column layout
- [ ] Bottom sheet doesn't overlap form
- [ ] Location cards stack nicely
- [ ] Vehicle cards take full width
- [ ] Scrolling is smooth

### Accessibility
- [ ] Tab navigation works
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader friendly

## Performance Tips

1. **Lazy load vehicle details expansion**
```tsx
const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);
// Only render expanded content when needed
{expandedVehicle === vehicle.id && <ExpandedDetails />}
```

2. **Memoize expensive calculations**
```tsx
const estimatedFee = useMemo(() => 
    calculateDeliveryFee(...),
    [distance, weight, vehicle]
);
```

3. **Debounce location input**
```tsx
useEffect(() => {
    const timer = setTimeout(() => {
        calculateDistance();
    }, 500);
    return () => clearTimeout(timer);
}, [pickupLocation, dropLocation]);
```

## Browser Testing

### Chrome DevTools
- Test responsive design
- Check GPU rendering
- Monitor performance metrics
- Test on different connection speeds

### Safari
- Test backdrop-filter behavior
- Check iOS-specific styling
- Test gesture interactions

### Firefox
- Verify drop-shadow rendering
- Check border-glow effects
- Test animations

## API Integration

### Fetch Vehicles
```tsx
useEffect(() => {
    const fetchVehicles = async () => {
        try {
            const response = await api.getVehicles({
                distance: calculatedDistance,
                weight: totalKg
            });
            setVehicles(response.data);
        } catch (error) {
            toast.error('Failed to load vehicles');
        }
    };
    
    if (calculatedDistance > 0) {
        fetchVehicles();
    }
}, [calculatedDistance, totalKg]);
```

### Real-time Pricing
```tsx
useEffect(() => {
    const priceInterval = setInterval(async () => {
        const prices = await api.getVehiclePrices({
            distance: calculatedDistance,
            weight: totalKg
        });
        updateVehiclePrices(prices);
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(priceInterval);
}, [calculatedDistance, totalKg]);
```

### Create Delivery Order
```tsx
const handleConfirmDelivery = async () => {
    try {
        const result = await api.post('/deliveries', {
            orderId,
            vehicleId: selectedVehicle.id,
            pickupLocation,
            dropLocation,
            distance: calculatedDistance,
            estimatedCost: calculateDeliveryFee(selectedVehicle, ...),
            timestamp: new Date().toISOString()
        });
        
        navigate(`/delivery/${result.id}`);
    } catch (error) {
        toast.error('Failed to create delivery');
    }
};
```

## Troubleshooting

### Glass Effect Not Visible
- Check if browser supports `backdrop-filter`
- Ensure CSS is properly imported
- Check z-index conflicts
- Verify background is semi-transparent

### Distance Not Calculating
- Verify coordinates are numbers (not strings)
- Check latitude range: -90 to 90
- Check longitude range: -180 to 180
- Debug in browser console: `calculateDistance(lat1, lon1, lat2, lon2)`

### Vehicles Not Loading
- Check API response format
- Verify VehicleType interface matches
- Look for console errors
- Check loading state

### Mobile Layout Issues
- Check viewport meta tag in HTML head
- Verify Tailwind breakpoints match
- Test on actual device/emulator
- Check for overflow content

## Deployment

1. **Build and Test**
```bash
npm run build
npm run test
```

2. **Check Bundle Size**
```bash
npm run build --analyze
```

3. **Performance Metrics**
- Core Web Vitals
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

4. **Production Environment**
- Use minified CSS
- Enable caching
- Optimize images
- Use CDN for assets

## Support & Feedback

Report issues or suggest improvements to the development team.

Last Updated: Always check [DELIVERY_UI_GUIDE.md](./DELIVERY_UI_GUIDE.md) for latest features.
