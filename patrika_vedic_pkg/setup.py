from setuptools import setup, find_packages

setup(
    name="patrika-vedic",
    version="1.0.0",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "patrika-vedic=patrika_vedic.cli:main",
        ],
    },
)
