#!/bin/bash

echo "Checking for image files in canonical directory..."
count=$(find images/products-images -type f | wc -l)
echo "Files in images/products-images: $count"

echo ""
echo "Sample files:"
ls -1 images/products-images | head -5

echo ""
echo "Checking for product IDs matching the two migrated products..."
ls -1 images/products-images | grep -E "2c4d1bf4|5a67faa0"  || echo "No files found for those product IDs"

echo ""
echo "Checking uploads/products for the source files..."
ls -1 uploads/products | grep -E "1779451990095|1778067297559" | head -5
