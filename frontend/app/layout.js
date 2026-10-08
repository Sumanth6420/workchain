import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import Navbar from "../components/Navbar";
import MessageBar from "../components/MessageBar";

export const metadata = {
  title: "WorkChain",
  description: "Freelance marketplace with blockchain milestone payments",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="container">
            <Navbar />
            <MessageBar />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
