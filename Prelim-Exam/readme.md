### \# ⚡ Sorting Algorithm Stress Test



An interactive \*\*Streamlit\*\* web application designed to benchmark and visualize the performance of classic sorting algorithms. This tool allows users to upload custom datasets and compare how \*\*Bubble Sort\*\*, \*\*Insertion Sort\*\*, and \*\*Merge Sort\*\* handle increasing scales of data.



##### 📊 **Performance Benchmarks**



The following data shows how each algorithm performs as the dataset grows. Notice how Merge Sort maintains speed while Bubble and Insertion sort times grow exponentially.



Merge sort :



1000 rows = 0.0055 seconds



10,000 rows = 0.0891 seconds



100,000 =  1.0200 seconds



Insertion Sort :



1000 rows =  0.0232 seconds



10,000 rows = 2.4936 seconds



100,000 =  12 minutes 



bubble sort :



1000 rows =  0.0548 seconds



10,000 rows = 4.6939 seconds



100,000 =  40 minutes









---



**## 🚀 Quick Start Guide**



**### 1. Install Dependencies**

Ensure you have Python installed, then run the following command in your terminal to install \*\*Streamlit\*\* and \*\*Pandas\*\*:



```bash

pip install streamlit pandas



**2. Run the Application**

Navigate to the folder containing your prelim.py file and execute:



streamlit run prelim.py





**🛠 Features**



Custom CSV Upload: Load your own data and select any column for sorting.Hybrid 



Row Selection: Choose between convenient presets (1k, 10k, 100k) or input a custom row count.



Real-time Progress: Visual feedback via a progress bar for $O(n^2)$ algorithms.



Safety Warnings: Built-in alerts to prevent the UI from freezing when attempting large $O(n^2)$ sorts.



Data Preview: Instantly view raw data and the top sorted results.







