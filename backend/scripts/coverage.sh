#!/bin/bash

echo "🧪 Running Test Coverage Analysis for DuoFlow Finance"
echo "======================================================="
echo ""

# Run pytest with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing --cov-report=json tests/

echo ""
echo "📊 Coverage Report Generated!"
echo ""
echo "📁 Reports saved to:"
echo "   HTML:  htmlcov/index.html"
echo "   JSON:  coverage.json"
echo ""
echo "📈 To view HTML report:"
echo "   Open htmlcov/index.html in your browser"
echo ""

# Extract coverage percentage from JSON
if [ -f "coverage.json" ]; then
    COVERAGE=$(python3 -c "import json; data=json.load(open('coverage.json')); print(f\"{data['totals']['percent_covered']:.2f}%\")")
    echo "✅ Total Coverage: $COVERAGE"
    echo ""
    
    # Check if coverage meets 85% target
    COVERAGE_NUM=$(python3 -c "import json; print(json.load(open('coverage.json'))['totals']['percent_covered'])")
    if (( $(echo "$COVERAGE_NUM >= 85" | bc -l) )); then
        echo "🎉 SUCCESS! Coverage ≥ 85% target met!"
    else
        echo "⚠️  WARNING: Coverage < 85% target (current: ${COVERAGE})"
        echo "   Add more tests to reach the 85% goal."
    fi
fi
