'use client';

import { useEffect, useState } from 'react';
import { OrderAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';

interface Props {
  packagingGrams: string;
  approvedCountries: string[];
  onPackagingChange: (value: string) => void;
  onCountriesChange: (value: string[]) => void;
}

export default function ProductShippingFields({ packagingGrams, approvedCountries, onPackagingChange, onCountriesChange }: Props) {
  const [countries, setCountries] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    OrderAPI.getShippingCountries().then(result => {
      if (active) setCountries(result.countries.filter(country => country !== 'Thailand'));
    }).catch(() => {
      if (active) setError('Could not load shipping destinations. Reload before changing approvals.');
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="mb-6 border-t border-[#B49B73]/20 pt-4">
      <Input label="Individual paper protection (grams)" type="number" min="0" max="30000" step="1"
        value={packagingGrams} onChange={event => onPackagingChange(event.target.value)} fullWidth />
      <p className="text-xs text-[#e3dcd4]/70 mb-4">Weigh this item's wrap or fitted insert. Exclude the shared outer carton. Leave blank if unmeasured; use 0 only when no individual protection is needed.</p>
      <label className="block font-suisse-intl-mono text-xs uppercase mb-2" htmlFor="shipping-countries">Approved international destinations</label>
      <select id="shipping-countries" multiple value={approvedCountries} disabled={!countries.length}
        onChange={event => onCountriesChange(Array.from(event.target.selectedOptions, option => option.value))}
        className="w-full h-40 bg-[#181818] border border-[#7c4d33]/50 text-[#F5F1E6] rounded-box p-3">
        {countries.map(country => <option key={country} value={country}>{country}</option>)}
      </select>
      <p className="text-xs text-[#e3dcd4]/70 mt-2">Select only destinations checked for this product with the carrier, including import rules. Hold Ctrl or Command to select several. Matches and lighters remain excluded from standard international parcels.</p>
      {error && <p role="alert" className="text-sm text-[#E67373] mt-2">{error}</p>}
    </div>
  );
}
