"""启动器：找空闲端口、自动开浏览器、起服务。"""
import socket
import sys
import threading
import webbrowser


def free_port(base=8973):
    for p in range(base, base + 30):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                continue
    return base


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    port = free_port()
    url = f"http://127.0.0.1:{port}/"
    print()
    print("=" * 50)
    print("  📚 自动翻译阅读器 正在启动…")
    print(f"  浏览器将自动打开：{url}")
    print("  如未打开，请手动复制上面的地址到浏览器。")
    print("  关闭本窗口即可退出程序。")
    print("=" * 50)
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")


if __name__ == "__main__":
    main()
