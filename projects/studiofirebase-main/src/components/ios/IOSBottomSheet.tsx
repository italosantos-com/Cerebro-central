import { motion } from "framer-motion";
import { ReactNode } from "react";

interface IOSBottomSheetProps {
  children: ReactNode;
}

export default function IOSBottomSheet({ children }: IOSBottomSheetProps) {
  return (
    <motion.div drag="y" className="ios-sheet">
      {children}
    </motion.div>
  );
}
