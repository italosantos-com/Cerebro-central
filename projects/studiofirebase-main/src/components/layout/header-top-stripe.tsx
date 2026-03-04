interface HeaderTopStripeProps {
  colorClass?: string;
}

const HeaderTopStripe = ({ colorClass = 'via-primary' }: HeaderTopStripeProps) => (
  <div className={`h-1 w-full bg-gradient-to-r from-transparent ${colorClass} to-transparent`} />
);

export default HeaderTopStripe;
