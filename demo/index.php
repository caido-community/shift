<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fake Search Engine</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">FakeSearch</h1>
            <p class="text-gray-600">The world's most fake search engine</p>
        </div>

        <!-- Search Form -->
        <div class="max-w-2xl mx-auto mb-8">
            <form method="GET" action="" class="flex gap-2">
                <input 
                    type="text" 
                    name="q" 
                    value="<?php echo htmlspecialchars($_GET['q'] ?? ''); ?>"
                    placeholder="Search for anything..."
                    class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <button 
                    type="submit"
                    class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    Search
                </button>
            </form>
        </div>

        <?php if (isset($_GET['q']) && !empty($_GET['q'])): ?>
            <!-- Search Results -->
            <div class="max-w-4xl mx-auto">
                <div class="mb-6">
                    <p class="text-gray-600">
                        About <?php echo rand(100, 9999); ?> results (<?php echo number_format(rand(1, 50) / 10, 1); ?> seconds)
                    </p>
                </div>

                <div class="space-y-6">
                    <?php
                    $fakeResults = [
                        [
                            'title' => 'Fake Result 1: ' . htmlspecialchars($_GET['q']),
                            'url' => 'https://example.com/result1',
                            'description' => 'This is a fake search result for "' . htmlspecialchars($_GET['q']) . '". It contains some sample text that would normally appear in search results.'
                        ],
                        [
                            'title' => 'Another Fake Result: ' . htmlspecialchars($_GET['q']),
                            'url' => 'https://example.com/result2',
                            'description' => 'Here is another fake result for your search term "' . htmlspecialchars($_GET['q']) . '". This demonstrates how search results might look.'
                        ],
                        [
                            'title' => 'Fake Article About ' . htmlspecialchars($_GET['q']),
                            'url' => 'https://example.com/article',
                            'description' => 'A comprehensive fake article discussing various aspects of "' . htmlspecialchars($_GET['q']) . '". This would be a detailed page with lots of information.'
                        ],
                        [
                            'title' => 'Fake Tutorial: ' . htmlspecialchars($_GET['q']),
                            'url' => 'https://example.com/tutorial',
                            'description' => 'Learn everything about "' . htmlspecialchars($_GET['q']) . '" with this fake tutorial. Step-by-step guide with examples and best practices.'
                        ],
                        [
                            'title' => 'Fake Documentation: ' . htmlspecialchars($_GET['q']),
                            'url' => 'https://example.com/docs',
                            'description' => 'Official fake documentation for "' . htmlspecialchars($_GET['q']) . '". Complete API reference, examples, and implementation guides.'
                        ]
                    ];

                    foreach ($fakeResults as $result): ?>
                        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <a href="<?php echo $result['url']; ?>" class="block">
                                <h3 class="text-xl font-medium text-blue-600 hover:text-blue-800 mb-2">
                                    <?php echo $result['title']; ?>
                                </h3>
                                <p class="text-green-700 text-sm mb-2"><?php echo $result['url']; ?></p>
                                <p class="text-gray-700"><?php echo $result['description']; ?></p>
                            </a>
                        </div>
                    <?php endforeach; ?>
                </div>

                <!-- Pagination -->
                <div class="mt-8 flex justify-center">
                    <nav class="flex items-center space-x-2">
                        <span class="px-3 py-2 text-gray-500">Previous</span>
                        <span class="px-3 py-2 bg-blue-600 text-white rounded">1</span>
                        <a href="#" class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">2</a>
                        <a href="#" class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">3</a>
                        <span class="px-3 py-2 text-gray-500">...</span>
                        <a href="#" class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">10</a>
                        <a href="#" class="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded">Next</a>
                    </nav>
                </div>
            </div>

            <script id="search-data">
            window.searchTerm = "<?php echo $_GET['q']; ?>"; 
            </script>

        <?php else: ?>
            <!-- Welcome Message -->
            <div class="max-w-2xl mx-auto text-center">
                <div class="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h2 class="text-2xl font-semibold text-gray-800 mb-4">Welcome to FakeSearch</h2>
                    <p class="text-gray-600 mb-6">
                        Enter a search term above to see fake results. This is a demonstration page for testing purposes.
                    </p>
                    <div class="text-sm text-gray-500">
                        <p>Try searching for terms like:</p>
                        <div class="flex flex-wrap justify-center gap-2 mt-2">
                            <span class="px-3 py-1 bg-gray-100 rounded-full">javascript</span>
                            <span class="px-3 py-1 bg-gray-100 rounded-full">python</span>
                            <span class="px-3 py-1 bg-gray-100 rounded-full">web development</span>
                            <span class="px-3 py-1 bg-gray-100 rounded-full">security</span>
                        </div>
                    </div>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <!-- Footer -->
    <footer class="mt-16 py-8 border-t border-gray-200">
        <div class="container mx-auto px-4 text-center text-gray-500">
            <p>&copy; 2024 FakeSearch. This is a demonstration page only.</p>
        </div>
    </footer>
</body>
</html>
