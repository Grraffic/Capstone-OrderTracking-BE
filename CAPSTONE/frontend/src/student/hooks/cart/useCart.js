/**
 * useCart Hook
 *
 * Re-export useCart from CartContext for convenience.
 * This allows importing from the hooks directory while keeping
 * the actual implementation in the context file.
 *
 * Usage:
 * ```jsx
 * import { useCart } from '../hooks';
 * const { items, loading, addToCart, removeFromCart } = useCart();
 * ```
 */
export { useCart } from "../../../context/CartContext";
