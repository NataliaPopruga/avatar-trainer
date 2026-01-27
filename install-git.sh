#!/bin/bash

echo "Установка Git на macOS"
echo "======================"
echo ""

# Проверка наличия Homebrew
if command -v brew &> /dev/null; then
    echo "✓ Homebrew найден. Устанавливаю git через Homebrew..."
    brew install git
    exit 0
fi

# Если Homebrew не установлен, пробуем принять лицензию Xcode
echo "Попытка принять лицензию Xcode (git уже установлен в системе)..."
sudo xcodebuild -license accept

if [ $? -eq 0 ]; then
    echo "✓ Лицензия принята. Проверяю git..."
    git --version
    echo ""
    echo "✓ Git готов к использованию!"
else
    echo ""
    echo "Если установка не удалась, выполните вручную:"
    echo "1. Для установки через Homebrew:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "   brew install git"
    echo ""
    echo "2. Или примите лицензию Xcode:"
    echo "   sudo xcodebuild -license"
    echo "   (нажмите пробел для прокрутки, затем введите 'agree')"
fi
