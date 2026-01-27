import time

def bubble_sort_descending(arr):
    """
    Sorts an array using the bubble sort algorithm in descending order.
    
    Args:
        arr: List of comparable elements to sort
        
    Returns:
        Tuple of (sorted list in descending order, time taken in seconds)
    """
    start_time = time.time()
    n = len(arr)
    
    # Traverse through all array elements
    for i in range(n):
        # Flag to optimize by detecting if array is already sorted
        swapped = False
        
        # Last i elements are already in place
        for j in range(0, n - i - 1):
            # Swap if the element found is less than the next element (descending order)
            if arr[j] < arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        
        # If no swaps occurred, array is sorted
        if not swapped:
            break
    
    end_time = time.time()
    time_taken = end_time - start_time
    
    return arr, time_taken


def read_dataset(filename):
    """
    Reads numerical data from a file (one number per line).
    
    Args:
        filename: Path to the data file
        
    Returns:
        List of integers
    """
    try:
        with open(filename, 'r') as f:
            data = [int(line.strip()) for line in f if line.strip()]
        return data
    except FileNotFoundError:
        print(f"Error: File '{filename}' not found.")
        return []


# Main execution
if __name__ == "__main__":
    # Read data from dataset.txt
    dataset_file = "dataset.txt"
    data = read_dataset(dataset_file)
    
    if data:
        print(f"Loaded {len(data)} numbers from {dataset_file}")
        print()
        
        # Perform bubble sort in descending order
        print("Starting Bubble Sort (Descending Order)...")
        sorted_data, time_taken = bubble_sort_descending(data.copy())
        
        # Display results
        print()
        print("=" * 60)
        print("RESULTS")
        print("=" * 60)
        print(f"Time spent: {time_taken:.6f} seconds")
        print(f"Total elements sorted: {len(sorted_data)}")
        print()
        print("All sorted data (descending order):")
        print(sorted_data)
        print("=" * 60)
