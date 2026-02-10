export function getProfileType(profile: string) {
  const profileTypeMap: Record<string, string> = {
    snabb: 'fast',
    patient: 'patient',
    kod: 'coding',
    vetenskap: 'science',
    strategi: 'strategy'
  };

  return profileTypeMap[profile] || 'fast';
}
