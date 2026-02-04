import subprocess

def very_bad_function(a, b, c, d, e, f):
    if a:
        if b:
            if c:
                if d:
                    if e:
                        if f:
                            print("Too deep")

subprocess.call("ls", shell=True)
