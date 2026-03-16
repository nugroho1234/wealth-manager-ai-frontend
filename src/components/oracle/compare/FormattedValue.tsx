/**
 * FormattedValue Component
 * Displays values with enhanced styling for N/A cases
 * Returns JSX with gray italic text for null/empty values
 */

interface FormattedValueProps {
  value: any;
}

export default function FormattedValue({ value }: FormattedValueProps): JSX.Element {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 italic">N/A</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">N/A</span>;
    }
    return <span className="text-gray-700">{value.join(', ')}</span>;
  }

  if (typeof value === 'object') {
    return <span className="text-gray-700">{JSON.stringify(value)}</span>;
  }

  return <span className="text-gray-700">{String(value)}</span>;
}
