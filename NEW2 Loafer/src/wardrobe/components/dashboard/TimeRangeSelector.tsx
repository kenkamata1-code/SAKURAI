export type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL';

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1M', label: '1ヶ月' },
  { value: '3M', label: '3ヶ月' },
  { value: '6M', label: '6ヶ月' },
  { value: '1Y', label: '1年' },
  { value: '2Y', label: '2年' },
  { value: 'ALL', label: '全期間' },
];

export default function TimeRangeSelector({ selected, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1 text-xs transition ${
            selected === range.value
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

