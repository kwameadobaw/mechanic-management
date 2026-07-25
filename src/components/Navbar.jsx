import { Link, useNavigate } from "react-router-dom";
import { signOutShop } from "../lib/api";

export default function Navbar({ session }) {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOutShop();
    navigate("/");
  }

  const shopName = session?.user?.user_metadata?.shop_name || session?.user?.email;

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">T&amp;T</span>
          Torque &amp; Track
        </Link>
        <div className="nav-actions">
          {session ? (
            <>
              <span className="nav-meta">{shopName}</span>
              <button className="btn btn-secondary" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/track" className="btn btn-ghost">
                Track my vehicle
              </Link>
              <Link to="/admin/login" className="btn btn-secondary">
                Shop login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
