export default function Button({ children, variant = 'primary', className = '', ...rest }) {
  const base = 'px-4 py-2 rounded-md font-medium transition shadow-sm';
  const variants = {
    primary: `${base} bg-primary text-white hover:bg-blue-700`,
    secondary: `${base} bg-secondary text-white hover:bg-green-700`,
  };
  return (
    <button className={`${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
