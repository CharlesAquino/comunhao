import { createSanctuaryIcon } from './createSanctuaryIcon';

const flame = <path d="M12 5.2c1.8 2.1 2.7 3.8 2.7 5.2A2.7 2.7 0 0 1 12 13.1a2.7 2.7 0 0 1-2.7-2.7c0-1.4.9-3.1 2.7-5.2Z" />;

export const PrayerTogetherIcon = createSanctuaryIcon('PrayerTogetherIcon', <>
  {flame}
  <path d="M3.5 12.2c1.2.1 2.3.6 3.1 1.5l2.2 2.4c.7.8 1.8 1.2 2.9 1.2h.3" />
  <path d="M20.5 12.2c-1.2.1-2.3.6-3.1 1.5l-2.2 2.4c-.7.8-1.8 1.2-2.9 1.2H12" />
  <path d="M4.1 16.1 7.7 20h8.6l3.6-3.9" />
  <path d="M7 5.4A7.2 7.2 0 0 1 12 3.3a7.2 7.2 0 0 1 5 2.1" />
</>);

export const RaisedPrayerIcon = createSanctuaryIcon('RaisedPrayerIcon', <>
  <path d="M8.2 11V5.8a1.2 1.2 0 0 1 2.4 0v4.1-5.2a1.2 1.2 0 0 1 2.4 0v5.2-4.2a1.2 1.2 0 0 1 2.4 0v4.8-3a1.2 1.2 0 0 1 2.4 0v6.1c0 4.1-2.4 6.7-6 6.7-2.6 0-4.2-1.2-5.5-3.4l-2.2-3.7a1.4 1.4 0 0 1 2.2-1.7l1.9 1.8" />
  <path d="M4.2 5.4 2.8 4M6.1 3.8 5.5 1.9M3.7 7.6H1.8" />
</>);

export const IntercessionIcon = createSanctuaryIcon('IntercessionIcon', <>
  {flame}
  <path d="M4 11.8v1.1c0 4.4 3.6 8 8 8s8-3.6 8-8v-1.1" />
  <path d="M4 11.8c1.9.2 3.5 1.2 4.5 2.8L12 19l3.5-4.4c1-1.6 2.6-2.6 4.5-2.8" />
  <path d="M7.1 4.6A7.7 7.7 0 0 1 12 2.9a7.7 7.7 0 0 1 4.9 1.7" />
</>);

export const PrayerCareIcon = createSanctuaryIcon('PrayerCareIcon', <>
  <path d="M12 3.2c2 2.4 3 4.2 3 5.7a3 3 0 0 1-6 0c0-1.5 1-3.3 3-5.7Z" fill="currentColor" fillOpacity=".13" />
  <path d="M12 5.8c.9 1.2 1.4 2.1 1.4 2.9a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.7 1.4-2.9Z" fill="currentColor" fillOpacity=".42" stroke="none" />
  <path d="M3.2 13.3c1.6-.1 3 .5 4.1 1.7l1.4 1.5c.8.9 1.9 1.4 3.1 1.4h.2" />
  <path d="M20.8 13.3c-1.6-.1-3 .5-4.1 1.7l-1.4 1.5c-.8.9-1.9 1.4-3.1 1.4H12" />
  <path d="M4.1 16.5 7.5 20h9l3.4-3.5" />
  <path d="M6.4 7.4A7.2 7.2 0 0 1 12 4.7a7.2 7.2 0 0 1 5.6 2.7" strokeOpacity=".58" />
  <path d="M8 2.8A9.8 9.8 0 0 1 12 2a9.8 9.8 0 0 1 4 .8" strokeOpacity=".3" />
</>);

export const QuietPrayerIcon = createSanctuaryIcon('QuietPrayerIcon', <>
  {flame}
  <path d="M6.2 16.8A7.8 7.8 0 0 1 4.3 12c0-1.8.6-3.5 1.6-4.8M17.8 16.8a7.8 7.8 0 0 0 1.9-4.8c0-1.8-.6-3.5-1.6-4.8" />
  <path d="M7.4 19.1h9.2M9.2 21.2h5.6" />
</>);

export const PrayerTextIcon = createSanctuaryIcon('PrayerTextIcon', <>
  <path d="M5 4.2h14v13.2H9.2L5 20.8V4.2Z" />
  <path d="M8.3 8h7.4M8.3 11.2h5.4M8.3 14.4h3.3" />
  <path d="M17 2.2v4M15 4.2h4" />
</>);

export const PrayerVoiceIcon = createSanctuaryIcon('PrayerVoiceIcon', <>
  <path d="M9 6.2a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0v-5Z" />
  <path d="M6.5 10.8v.7a5.5 5.5 0 0 0 11 0v-.7M12 17v4M9.2 21h5.6" />
  <path d="M4.1 7.6a9 9 0 0 0 0 4.8M19.9 7.6a9 9 0 0 1 0 4.8" />
</>);

export const PrayerVideoIcon = createSanctuaryIcon('PrayerVideoIcon', <>
  <rect x="3" y="5.2" width="13" height="13.6" rx="2.2" />
  <path d="m16 9.4 5-2.5v10.2l-5-2.5" />
  <path d="M9.5 8.5c1.2 1.3 1.8 2.4 1.8 3.3a1.8 1.8 0 0 1-3.6 0c0-.9.6-2 1.8-3.3Z" />
</>);

export const PrayerPresenceIcon = createSanctuaryIcon('PrayerPresenceIcon', <>
  <path d="M5 20v-8a7 7 0 0 1 14 0v8" />
  <path d="M8.5 20v-7.6a3.5 3.5 0 0 1 7 0V20M3 20h18" />
  <circle cx="12" cy="8" r="1.2" />
</>);

export const MuralComposeIcon = createSanctuaryIcon('MuralComposeIcon', <>
  <path d="M5 4.2h11.2A2.8 2.8 0 0 1 19 7v12.8H7.8A2.8 2.8 0 0 1 5 17V4.2Z" />
  <path d="M5 16.4c.7-.6 1.6-.9 2.8-.9H19" />
  <path d="M9 8.1h6M9 11h3.8" />
  <path d="M16.8 2.2v4.2M14.7 4.3h4.2" />
</>);

export const LamparinaIcon = createSanctuaryIcon('LamparinaIcon', <>
  <path d="M12 2c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 1-4 3-7Z" />
  <path d="M12 5.5c1 1.5 1 2.5 1 3.5a1 1 0 0 1-2 0c0-1 0-2 1-3.5Z" fill="currentColor" fillOpacity=".4" stroke="none" />
  <path d="M4 12a8 8 0 0 0 16 0H4Z" />
  <path d="M10 20h4l1.5 2h-7L10 20Z" />
</>);
