import { AnimatePresence, motion } from "framer-motion";

interface IOSAlertProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function IOSAlert({ open, title, message, onClose }: IOSAlertProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="ios-alert-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="ios-alert"
            initial={{ scale: .8 }}
            animate={{ scale: 1 }}
            exit={{ scale: .8 }}
          >
            <h3>{title}</h3>
            <p>{message}</p>
            <button className="ios-button" onClick={onClose}>OK</button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
