import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * StockLevelsChart Component
 *
 * Displays a bar chart showing inventory statuses:
 * - Above Threshold (green)
 * - At Reorder Point (orange)
 * - Critical (red)
 * - Out of Stock (gray)
 *
 * Features:
 * - Responsive design for desktop and mobile
 * - Legend text hides automatically on smaller screens
 */
const StockLevelsChart = ({ data }) => {
  // Detect screen width to hide legend on mobile
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Run once on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Stock Levels</h2>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
            />

            {/* Hide Legend if mobile */}
            {!isMobile && (
              <Legend
                wrapperStyle={{ paddingBottom: "10px" }}
                verticalAlign="top"
                height={36}
                iconType="square"
              />
            )}

            <Bar
              dataKey="Above Threshold"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="At Reorder Point"
              fill="#f59e0b"
              radius={[8, 8, 0, 0]}
            />
            <Bar dataKey="Critical" fill="#ef4444" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Out of Stock" fill="#6b7280" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StockLevelsChart;
