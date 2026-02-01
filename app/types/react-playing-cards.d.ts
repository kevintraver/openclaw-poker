declare module "@heruka_urgyen/react-playing-cards/lib/TcN" {
  import { CSSProperties } from "react";

  interface SvgCardProps {
    card: string;
    height?: string;
    back?: boolean;
    style?: CSSProperties;
    className?: string;
  }

  const SvgCard: React.FC<SvgCardProps>;
  export default SvgCard;
}
