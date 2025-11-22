import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemAdjustmentModal from "../Inventory/ItemAdjustmentModal";

describe("ItemAdjustmentModal", () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    isOpen: true,
    selectedItem: null,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    test("should not render when isOpen is false", () => {
      render(<ItemAdjustmentModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Add Inventory Item")).not.toBeInTheDocument();
    });

    test("should render modal when isOpen is true", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByText("Add Inventory Item")).toBeInTheDocument();
    });

    test("should render adjustment type toggle buttons", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByText("Inventory Threshold")).toBeInTheDocument();
      expect(screen.getByText("Item Details")).toBeInTheDocument();
    });

    test("should render all form fields", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByLabelText(/Education Level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Item Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Item Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unit Price/i)).toBeInTheDocument();
    });

    test("should render image upload area", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByText(/Drag image here or/i)).toBeInTheDocument();
      expect(screen.getByText(/Browse image/i)).toBeInTheDocument();
    });

    test("should render preview panel", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByText("Item Detail")).toBeInTheDocument();
      expect(screen.getByText("Item Details History")).toBeInTheDocument();
    });

    test("should render footer buttons", () => {
      render(<ItemAdjustmentModal {...defaultProps} />);
      expect(screen.getByRole("button", { name: /Back/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
    });
  });

  describe("Adjustment Type Toggle", () => {
    test("should toggle between Inventory Threshold and Item Details", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      const thresholdBtn = screen.getByRole("button", {
        name: /Inventory Threshold/i,
      });
      const detailsBtn = screen.getByRole("button", { name: /Item Details/i });

      // Item Details should be selected by default
      expect(detailsBtn).toHaveClass("bg-blue-900");

      // Click Inventory Threshold
      await user.click(thresholdBtn);
      expect(thresholdBtn).toHaveClass("bg-blue-900");
      expect(detailsBtn).not.toHaveClass("bg-blue-900");

      // Click Item Details again
      await user.click(detailsBtn);
      expect(detailsBtn).toHaveClass("bg-blue-900");
      expect(thresholdBtn).not.toHaveClass("bg-blue-900");
    });
  });

  describe("Form Input", () => {
    test("should update form fields on input change", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      const educationSelect = screen.getByLabelText(/Education Level/i);
      await user.selectOptions(educationSelect, "Grade 1");
      expect(educationSelect).toHaveValue("Grade 1");

      const categorySelect = screen.getByLabelText(/Item Category/i);
      await user.selectOptions(categorySelect, "Shirt");
      expect(categorySelect).toHaveValue("Shirt");

      const sizeSelect = screen.getByLabelText(/Size/i);
      await user.selectOptions(sizeSelect, "Medium");
      expect(sizeSelect).toHaveValue("Medium");

      const priceInput = screen.getByPlaceholderText("0.00");
      await user.type(priceInput, "250.50");
      expect(priceInput).toHaveValue(250.5);
    });
  });

  describe("Modal Actions", () => {
    test("should call onClose when Back button is clicked", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      const backBtn = screen.getByRole("button", { name: /Back/i });
      await user.click(backBtn);
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should call onClose when close icon is clicked", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      const closeBtn = screen.getByLabelText("Close modal");
      await user.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalled();
    });

    test("should validate form before submission", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      const doneBtn = screen.getByRole("button", { name: /Done/i });
      await user.click(doneBtn);

      // Should not call onSubmit if form is invalid
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    test("should submit form with valid data", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      // Fill in required fields
      await user.selectOptions(
        screen.getByLabelText(/Education Level/i),
        "Grade 1"
      );
      await user.selectOptions(
        screen.getByLabelText(/Item Category/i),
        "Shirt"
      );
      await user.selectOptions(screen.getByLabelText(/Size/i), "Medium");
      await user.selectOptions(
        screen.getByLabelText(/Description/i),
        "Regular Fit"
      );
      await user.selectOptions(screen.getByLabelText(/Item Type/i), "Uniform");
      await user.type(screen.getByPlaceholderText("0.00"), "250.50");

      const doneBtn = screen.getByRole("button", { name: /Done/i });
      await user.click(doneBtn);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            educationLevel: "Grade 1",
            itemCategory: "Shirt",
            size: "Medium",
            description: "Regular Fit",
            itemType: "Uniform",
            unitPrice: 250.5,
          })
        );
      });
    });
  });

  describe("Preview Panel", () => {
    test("should display selected values in preview", async () => {
      const user = userEvent.setup();
      render(<ItemAdjustmentModal {...defaultProps} />);

      await user.selectOptions(
        screen.getByLabelText(/Item Category/i),
        "Shirt"
      );
      await user.selectOptions(screen.getByLabelText(/Size/i), "Medium");

      // Preview should show selected values
      const previewSection = screen.getByText("Item Detail").closest("div");
      expect(previewSection).toHaveTextContent("Shirt");
      expect(previewSection).toHaveTextContent("Medium");
    });
  });
});
