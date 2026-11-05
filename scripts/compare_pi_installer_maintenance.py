#!/usr/bin/env python3
"""Compare an installer-only maintenance archive with its qualified predecessor."""
import ast
import hashlib
import json
from pathlib import Path
import sys
import zipfile

ALLOWED_FILES={'Apollo-Pi-Installer/install.py','Apollo-Pi-Installer/READ-ME-FIRST.md','Apollo-Pi-Installer/READ-ME-FIRST.html','Apollo-Pi-Installer/candidate.json'}
HELPERS={'support_summary','support_report_html','write_support_report'}
HOOK=ast.parse('''if (sys.platform.startswith("linux") and hasattr(os, "geteuid") and os.geteuid() == 0
        and any(mode in sys.argv[1:] for mode in ("--apply", "--repair-gateway"))):
    write_support_report(code)
''').body[0]
DUMP=lambda v:ast.dump(v,include_attributes=False)

# Only the exact reviewed error text is normalised. No operation, predicate,
# variable, return value, exception type or activation statement is ignored.
NEWER_HELP=ast.parse('''if code == "pi_installer_not_newer":
    return "Your installed Apollo release is newer than this installer. Keep it; do not retry the older installer or bypass this check. Contact support if the newer installation needs repair."
''').body[0]
OLD_RETRY=ast.parse('''print("Keep your SD card, registration and settings. Retry this installer; if it stops again, share the code and phase with support.", file=sys.stderr)
''').body[0]
NEWER_RETRY=ast.parse('''if code != "pi_installer_not_newer":
    print("Keep your SD card, registration and settings. Retry this installer; if it stops again, share the code and phase with support.", file=sys.stderr)
else:
    print("Keep your SD card, registration and settings. No downgrade was performed.", file=sys.stderr)
''').body[0]

class ReviewedErrorGuidance(ast.NodeTransformer):
    def visit_FunctionDef(self,node):
        if node.name=='failure_help':
            node.body=[n for n in node.body if DUMP(n)!=DUMP(NEWER_HELP)]
        return node

class StaticPrints(ast.NodeTransformer):
    def visit_Expr(self,node):
        call=node.value
        if (isinstance(call,ast.Call) and isinstance(call.func,ast.Name) and call.func.id=='print'
                and len(call.args)==1 and isinstance(call.args[0],ast.Constant)
                and isinstance(call.args[0].value,str) and not call.keywords):
            return None
        return self.generic_visit(node)

class DiagnosticHook(ast.NodeTransformer):
    def visit_ExceptHandler(self,node):
        node.body=[OLD_RETRY if DUMP(n)==DUMP(NEWER_RETRY) else self.visit(n) for n in node.body if DUMP(n)!=DUMP(HOOK)]
        return node


def compare(before,after):
    with zipfile.ZipFile(before) as a,zipfile.ZipFile(after) as b:
        na=a.namelist();nb=b.namelist()
        if len(set(na))!=len(na) or len(set(nb))!=len(nb) or set(na)!=set(nb): raise RuntimeError('maintenance_members_changed')
        if sum(e.file_size for e in b.infolist())>32*1024*1024: raise RuntimeError('maintenance_archive_too_large')
        changed=sorted(n for n in na if a.read(n)!=b.read(n))
        if not set(changed)<=ALLOWED_FILES: raise RuntimeError('maintenance_payload_changed')
        payload={n:hashlib.sha256(b.read(n)).hexdigest() for n in nb if '/payload/' in n}
        if len(payload)!=3 or not all(a.read(n)==b.read(n) for n in payload): raise RuntimeError('maintenance_updater_changed')
        old=ast.parse(a.read('Apollo-Pi-Installer/install.py').decode());new=ast.parse(b.read('Apollo-Pi-Installer/install.py').decode())
    funcs=lambda t:{v.name:v for v in t.body if isinstance(v,(ast.FunctionDef,ast.ClassDef))}
    fa,fb=funcs(old),funcs(new)
    if set(fa)-set(fb) or set(fb)-set(fa)!=HELPERS: raise RuntimeError('maintenance_functions_changed')
    for name in fa:
        left=ReviewedErrorGuidance().visit(fa[name]);right=ReviewedErrorGuidance().visit(fb[name])
        left=StaticPrints().visit(left) if name=='main' else left
        right=StaticPrints().visit(right) if name=='main' else right
        if DUMP(left)!=DUMP(right): raise RuntimeError('maintenance_activation_changed:'+name)
    old_top=[n for n in old.body if not isinstance(n,(ast.FunctionDef,ast.ClassDef))]
    new_top=[]
    for n in new.body:
        if isinstance(n,(ast.FunctionDef,ast.ClassDef)): continue
        if isinstance(n,ast.Assign) and len(n.targets)==1 and isinstance(n.targets[0],ast.Name) and n.targets[0].id in {'SUPPORT_PHASES','SUPPORT_CODES'}:
            v=n.value
            if not (isinstance(v,ast.Call) and isinstance(v.func,ast.Name) and v.func.id=='frozenset' and len(v.args)==1 and isinstance(v.args[0],ast.List) and all(isinstance(x,ast.Constant) and isinstance(x.value,str) for x in v.args[0].elts) and not v.keywords): raise RuntimeError('maintenance_public_allowlist_invalid')
            continue
        n=DiagnosticHook().visit(n)
        if n is not None:new_top.append(n)
    if [DUMP(x) for x in old_top]!=[DUMP(x) for x in new_top]: raise RuntimeError('maintenance_global_or_dispatch_changed')
    return {'changed_members':changed,'activation_logic_unchanged':True,'target_metadata_identical':True,'updater_payloads_identical':True,'updater_payload_sha256':payload}


if __name__=='__main__':
    try:
        if len(sys.argv)!=3: raise RuntimeError('usage: compare_pi_installer_maintenance.py PRIOR.zip NEW.zip')
        print(json.dumps(compare(Path(sys.argv[1]),Path(sys.argv[2])),sort_keys=True))
    except Exception as error:
        print(str(error),file=sys.stderr);sys.exit(1)
    sys.exit(0)
