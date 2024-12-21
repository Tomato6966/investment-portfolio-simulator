import { X } from "lucide-react";
import { useState } from "react";

import { usePortfolioStore } from "../store/portfolioStore";
import { Investment } from "../types";

interface EditInvestmentModalProps {
  investment: Investment;
  assetId: string;
  onClose: () => void;
}

export const EditInvestmentModal = ({ investment, assetId, onClose }: EditInvestmentModalProps) => {
  const updateInvestment = usePortfolioStore((state) => state.updateInvestment);
  const [amount, setAmount] = useState(investment.amount.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateInvestment(assetId, investment.id, {
      ...investment,
      amount: parseFloat(amount),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit Investment</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Investment Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded"
              step="0.01"
              min="0"
              required
            />
          </div>

          {investment.type === 'periodic' && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Note: Editing a periodic investment will affect all future investments.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
