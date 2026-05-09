<script lang="ts">
	import {
		Wifi, Tv, Phone, Snowflake, Thermometer, Wine, BedDouble, Cloud,
		Coffee, Car, Sun, Moon, Star, Music, Briefcase, Shield, Key,
		Lock, Unlock, Bell, Camera, Video, Mic, Headphones, Monitor,
		Laptop, Tablet, Smartphone, Watch, BatteryFull, Battery,
		BatteryCharging, Power, Zap, Activity, Heart, Droplet, Wind,
		Flame, Umbrella, MapPin, Navigation, Compass, Globe, Anchor,
		Plane, Train, Truck, Bike, Bus, CarTaxiFront, Palmtree,
		Waves, Shirt, Sparkles, Droplets, KeyRound, Sunrise, Mountain, 
		DoorOpen, Trees, Clock, Bath
	} from 'lucide-svelte';

	let { name, class: className = '', size = 16, strokeWidth = 2 } = $props<{
		name: string;
		class?: string;
		size?: number;
		strokeWidth?: number;
	}>();

	const ICON_MAP: Record<string, any> = {
		'wifi': Wifi,
		'tv': Tv,
		'phone': Phone,
		'snowflake': Snowflake,
		'thermometer': Thermometer,
		'wine': Wine,
		'bed-double': BedDouble,
		'cloud': Cloud,
		'coffee': Coffee,
		'car': Car,
		'sun': Sun,
		'moon': Moon,
		'star': Star,
		'music': Music,
		'briefcase': Briefcase,
		'shield': Shield,
		'key': Key,
		'lock': Lock,
		'unlock': Unlock,
		'bell': Bell,
		'camera': Camera,
		'video': Video,
		'mic': Mic,
		'headphones': Headphones,
		'monitor': Monitor,
		'laptop': Laptop,
		'tablet': Tablet,
		'smartphone': Smartphone,
		'watch': Watch,
		'battery-full': BatteryFull,
		'battery-empty': Battery,
		'battery-charging': BatteryCharging,
		'power': Power,
		'zap': Zap,
		'activity': Activity,
		'heart': Heart,
		'droplet': Droplet,
		'wind': Wind,
		'flame': Flame,
		'umbrella': Umbrella,
		'map-pin': MapPin,
		'navigation': Navigation,
		'compass': Compass,
		'globe': Globe,
		'anchor': Anchor,
		'plane': Plane,
		'train': Train,
		'truck': Truck,
		'bike': Bike,
		'bus': Bus,
		'car-taxi-front': CarTaxiFront,
		'palmtree': Palmtree,
		'waves': Waves,
		'shirt': Shirt,
		'sparkles': Sparkles,
		'droplets': Droplets,
		'key-round': KeyRound,
		'sunrise': Sunrise,
		'mountain': Mountain,
		'door-open': DoorOpen,
		'trees': Trees,
		'clock': Clock,
		'bath': Bath
	};

	let IconComponent = $derived(name ? ICON_MAP[name] : null);
</script>

{#if IconComponent}
	<IconComponent {size} {strokeWidth} class={className} />
{:else}
	<!-- Fallback: Initial letters -->
	<span class="font-bold uppercase {className} flex items-center justify-center" style="font-size: {Math.max(10, size - 4)}px; width: {size}px; height: {size}px;">
		{name ? name.slice(0, 2) : '?'}
	</span>
{/if}
